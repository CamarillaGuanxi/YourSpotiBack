
import { spotifyOAuth } from '../config.js';

export const autentication = async (req, res) => {
    try {
        const authURL = `https://accounts.spotify.com/authorize?response_type=code&client_id=${process.env.SPOTIFY_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI)}&scope=${encodeURIComponent('user-read-private user-read-email playlist-read-private')}&state=randomstring`;
        res.redirect(authURL);
    } catch (error) {
        console.error('Error al iniciar sesion con Spotify', error.message);
        res.status(500).json({ error: 'Error de con' });
    }
};