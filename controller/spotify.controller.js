
import { spotifyOAuth } from '../config.js';
import { getConnection } from '../db/dbconfig.js';
import axios from 'axios';
import { config } from 'dotenv';
config();
import { autentication_youtube } from './youtube.controller.js';
export const autentication = async (req, res) => {
    try {

        const authURL = spotifyOAuth.authorizeURL({
            redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
            scope: 'user-read-private user-read-email playlist-read-private playlist-modify-public playlist-modify-private',
            state: 'randomstring', // Asegúrate de usar una cadena única para evitar CSRF
        });
        console.log('Redirecting to Spotify authorization URL:');

        res.status(200).json({ authURL });
    } catch (error) {
        console.error('Error al iniciar sesion con Spotify', error.message);
        res.status(500).json({ error: 'Error de con' });
    }
};


export const callback = async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).json({ error: 'Authorization code not provided' });
    }
    try {
        console.log('Redirecting to Spotify authorization URL:');

        const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', null, {
            params: {
                code: code,
                redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
                grant_type: 'authorization_code',
            },
            headers: {
                'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
            },
        });

        const body = tokenResponse;
        await update_data(req, res, body);

    } catch (error) {
        console.error('Error al autenticar con Spotify:', error);
        res.status(500).json({ message: 'Error al autenticar con Spotify' });
    }

}

export const update_data = async (req, res, body) => {
    const db = await getConnection();
    const { access_token, refresh_token, expires_in } = body.data;

    try {
        // Paso 2: Usar el access_token para obtener el ID del usuario de Spotify
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
        });

        const spotifyId = userResponse.data.id;

        // Paso 3: Crear un nuevo objeto con los datos de Spotify
        const spotifyData = {
            spotify_id: spotifyId,
            access_token,
            refresh_token,
            expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        };

        const collection = db.collection('users');

        // Actualizar o insertar datos del usuario
        const user = await collection.findOne({ 'platforms.spotify.spotify_id': spotifyId });
        if (user) {
            await collection.updateOne(
                { 'platforms.spotify.spotify_id': spotifyId },
                {
                    $set: {
                        'platforms.spotify': spotifyData,
                        updated_at: new Date().toISOString(),
                    },
                }
            );
        } else {
            await collection.insertOne({
                user_id: spotifyId,
                platforms: {
                    spotify: spotifyData,
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
        }

        console.log('Spotify data updated or inserted successfully:');

        // Redirigir al flujo de autenticación de YouTube
        return autentication_youtube(req, res, spotifyId); // Asegúrate de que esta función maneje la respuesta
    } catch (error) {
        console.error('Error al autenticar con Spotify:', error);
        return res.status(500).json({ message: 'Error al autenticar con Spotify' });
    }
};

export const getPlaylists = async (req, res) => {
    const db = await getConnection();
    const userLogged = await req.cookies.user_id;
    try {
        const user = await db.collection('users').findOne({ user_id: userLogged });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const token = user.platforms.spotify.access_token; // ID de usuario de Spotify
        console.log('token', token);
        const playlists = await axios.get(`https://api.spotify.com/v1/me/playlists`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!playlists) {
            return res.status(404).json({ message: 'Playlists not found' });
        }
        res.status(200).json(playlists.data);
    } catch (error) {
        console.error('Error al obtener las listas de reproducción de Spotify:', error);
        res.status(500).json({ message: 'Error al obtener las listas de reproducción de Spotify' });
    }
}

export const migrate = async (req, res) => {
    const { id, name, description } = req.body;
    const userLogged = req.cookies.user_id;

    try {
        const user = await getUserFromDB(userLogged);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const tokenSpotify = user.platforms.spotify.access_token;
        const tokenYoutube = user.platforms.youtube.access_token;

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

            console.log(`Migrando pista: ${trackName} por ${trackArtist}`);

            try {
                const videoData = await searchYouTubeVideo(trackName, trackArtist);
                if (videoData && !addedVideoIds.has(videoData.videoId)) {
                    await addVideoToYouTubePlaylist(youtubePlaylistId, videoData.videoId, videoData.kind, tokenYoutube);
                    addedVideoIds.add(videoData.videoId);
                    console.log(`Pista agregada a YouTube: ${trackName} por ${trackArtist}`);
                    await sleep(5000);
                } else {
                    console.log(`Video duplicado o no encontrado para: ${trackName} por ${trackArtist}`);
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


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getUserFromDB = async (userId) => {
    const db = await getConnection();
    return db.collection('users').findOne({ user_id: userId });
};

const fetchSpotifyTracks = async (playlistId, token) => {
    const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
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
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
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
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
};

