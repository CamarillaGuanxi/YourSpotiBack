import { getConnection } from '../db/dbconfig.js';
import { decrypt } from '../config.js';
import axios from 'axios';
import { config } from 'dotenv';
config();
export const getPlaylists = async (req, res) => {
    const db = await getConnection();
    const userLogged = await decrypt(req.cookies.user_id);

    try {
        const user = await db.collection('users').findOne({ user_id: userLogged });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const token = await decrypt(user.platforms.spotify.access_token);
        const playlists = await axios.get('https://api.spotify.com/v1/me/playlists', {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!playlists) {
            return res.status(404).json({ message: 'Playlists not found' });
        }
        res.status(200).json(playlists.data);
    } catch (error) {
        console.error('Error al obtener las listas de reproducción de Spotify:', error);
        res.status(500).json({ message: 'Error al obtener las listas de reproducción de Spotify' });
    }
};

export const migrate = async (req, res) => {
    const { id, name, description } = req.body;
    const userLogged = await decrypt(req.cookies.user_id);

    try {
        const user = await getUserFromDB(userLogged);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const tokenSpotify = await decrypt(user.platforms.spotify.access_token);
        const tokenYoutube = await decrypt(user.platforms.youtube.access_token);

        const spotifyTracks = await fetchSpotifyTracks(id, tokenSpotify);
        if (spotifyTracks.length === 0) {
            return res.status(404).json({ message: 'No tracks found in Spotify playlist' });
        }

        const youtubePlaylistId = await createYouTubePlaylist(name, description, tokenYoutube);
        if (!youtubePlaylistId) {
            return res.status(500).json({ message: 'Failed to create YouTube playlist' });
        }

        const addedVideoIds = new Set();

        for (const item of spotifyTracks) {
            const track = item.track;
            const trackName = track.name;
            const trackArtist = track.artists[0].name;

            try {
                const videoData = await searchYouTubeVideo(trackName, trackArtist);
                if (videoData && !addedVideoIds.has(videoData.videoId)) {
                    await addVideoToYouTubePlaylist(youtubePlaylistId, videoData.videoId, videoData.kind, tokenYoutube);
                    addedVideoIds.add(videoData.videoId);
                    await sleep(5000); // Sleep to avoid rate limiting
                }
            } catch (err) {
                console.error(`Error al procesar pista: ${trackName}`, err.message);
            }
        }

        res.status(200).json({ message: 'Playlist migrada a YouTube exitosamente' });

    } catch (error) {
        console.error('Error en la migración:', error);
        res.status(500).json({ message: 'Error durante la migración de la playlist' });
    }
};

// Helper functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getUserFromDB = async (userId) => {
    const db = await getConnection();
    return db.collection('users').findOne({ user_id: userId });
};

const fetchSpotifyTracks = async (playlistId, token) => {
    const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data?.items || [];
};

const createYouTubePlaylist = async (name, description, token) => {
    const response = await axios.post(
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet,status&key=${process.env.YOUTUBE_API_KEY}`,
        {
            snippet: { title: name, description },
            status: { privacyStatus: 'public' },
        },
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    return response.data?.id;
};

const searchYouTubeVideo = async (trackName, trackArtist) => {
    const query = `${trackName} ${trackArtist}`;
    const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${process.env.YOUTUBE_API_KEY}`
    );
    const video = response.data.items[0];
    return video ? { videoId: video.id.videoId, kind: video.id.kind } : null;
};

const addVideoToYouTubePlaylist = async (playlistId, videoId, kind, token) => {
    await axios.post(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&key=${process.env.YOUTUBE_API_KEY}`,
        {
            snippet: {
                playlistId,
                position: 0,
                resourceId: { kind, videoId },
            },
        },
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );
};
