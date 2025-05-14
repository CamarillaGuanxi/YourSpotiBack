import { getConnection } from '../db/dbconfig.js';
import axios from 'axios';
import { decrypt } from '../config.js';
import { config } from 'dotenv';

config();

// Helper para obtener el token de acceso desencriptado
const getDecryptedToken = async (encryptedToken) => {
    return await decrypt(encryptedToken);
};

// Helper para obtener el usuario de la base de datos
const getUserFromDB = async (userId) => {
    const db = await getConnection();
    return db.collection('users').findOne({ user_id: userId });
};

// Helper para obtener todas las playlists de YouTube
const fetchYouTubePlaylists = async (accessToken) => {
    let allPlaylists = [];
    let nextPageToken = null;

    do {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/playlists', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            params: {
                part: 'snippet',
                mine: true,
                maxResults: 50,
                pageToken: nextPageToken,
            },
        });

        const { items, nextPageToken: newToken } = response.data;
        allPlaylists = allPlaylists.concat(items);
        nextPageToken = newToken;
    } while (nextPageToken);

    return allPlaylists;
};

// Obtener playlists de YouTube
export const getPlaylists = async (req, res) => {
    try {
        const userIdEncrypted = req.cookies.user_id;
        const userId = await getDecryptedToken(userIdEncrypted);

        const user = await getUserFromDB(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const youtubeData = user.platforms?.youtube;
        if (!youtubeData) {
            return res.status(404).json({ message: 'YouTube data not found' });
        }

        const accessToken = await getDecryptedToken(youtubeData.access_token);
        const playlists = await fetchYouTubePlaylists(accessToken);

        res.status(200).json(playlists);
    } catch (error) {
        console.error('Error al obtener las listas de reproducción de YouTube:', error.response?.data || error.message);
        res.status(500).json({ message: 'Error al obtener las listas de reproducción de YouTube' });
    }
};

// Migrar playlists de YouTube a Spotify
export const migrate = async (req, res) => {
    const { id, name, description } = req.body;

    try {
        const userIdEncrypted = req.cookies.user_id;
        const userId = await getDecryptedToken(userIdEncrypted);

        const user = await getUserFromDB(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const tokenSpotify = await getDecryptedToken(user.platforms.spotify.access_token);
        const tokenYouTube = await getDecryptedToken(user.platforms.youtube.access_token);

        const playlists = await getPlaylistItems(id, tokenYouTube);
        if (!playlists) {
            return res.status(404).json({ message: 'Playlists not found' });
        }

        const spotifyPlaylistId = await createSpotifyPlaylist(userId, name, description, tokenSpotify);
        const allTracks = await processYouTubeTracks(playlists, tokenSpotify);

        await addTracksToSpotifyPlaylist(spotifyPlaylistId, allTracks, tokenSpotify);

        res.status(200).json({ message: 'Playlist migrada a Spotify exitosamente' });
    } catch (error) {
        console.error('Error durante la migración:', error.message);
        res.status(500).json({ message: 'Error durante la migración de la playlist' });
    }
};

// Helper para crear una playlist en Spotify
const createSpotifyPlaylist = async (userId, name, description, tokenSpotify) => {
    const response = await axios.post(
        `https://api.spotify.com/v1/users/${userId}/playlists`,
        {
            name,
            description,
            public: true,
        },
        {
            headers: {
                Authorization: `Bearer ${tokenSpotify}`,
                'Content-Type': 'application/json',
            },
        }
    );
    return response.data.id;
};

// Helper para procesar las pistas de YouTube
const processYouTubeTracks = async (playlists, tokenSpotify) => {
    const allTracks = new Set();

    for (const item of playlists) {
        const videoName = cleanVideoTitle(item.snippet.title);
        const videoArtist = item.snippet.videoOwnerChannelTitle;

        try {
            const searchResponse = await searchSpotifyTrack(videoName, tokenSpotify);
            if (searchResponse && searchResponse.length > 0) {
                const track = getClosestTrack(searchResponse, videoName);
                const trackUri = track.uri;

                if (!allTracks.has(trackUri)) {
                    allTracks.add(trackUri);
                }
            }
        } catch (error) {
            console.error(`Error al procesar la pista: ${videoName} por ${videoArtist}`, error.message);
        }
    }

    return Array.from(allTracks);
};

// Helper para agregar pistas a una playlist de Spotify
const addTracksToSpotifyPlaylist = async (playlistId, tracks, tokenSpotify) => {
    await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
            uris: tracks,
            position: 0,
        },
        {
            headers: {
                Authorization: `Bearer ${tokenSpotify}`,
            },
        }
    );
};

// Helper para obtener los elementos de una playlist de YouTube
const getPlaylistItems = async (playlistId, tokenYouTube) => {
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/playlistItems`, {
        headers: {
            Authorization: `Bearer ${tokenYouTube}`,
        },
        params: {
            part: 'snippet',
            playlistId,
            maxResults: 50,
        },
    });
    return response.data.items;
};

// Helper para buscar una pista en Spotify
const searchSpotifyTrack = async (trackName, tokenSpotify) => {
    const response = await axios.get(`https://api.spotify.com/v1/search`, {
        headers: {
            Authorization: `Bearer ${tokenSpotify}`,
        },
        params: {
            q: trackName,
            type: 'track',
            limit: 10,
        },
    });
    return response.data.tracks.items;
};

// Helper para limpiar el título de un video
const cleanVideoTitle = (title) => {
    return title.replace(/ *\([^)]*\) */g, '').trim();
};

// Helper para obtener la pista más cercana
const getClosestTrack = (tracks, videoName) => {
    return tracks.find((track) => track.name.toLowerCase() === videoName.toLowerCase()) || tracks[0];
};
