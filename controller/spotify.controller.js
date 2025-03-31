
import { spotifyOAuth } from '../config.js';
import { getConnection } from '../db/dbconfig.js';
import axios from 'axios';
import { config } from 'dotenv';
config();
export const autentication = async (req, res) => {
    try {
        const authURL = spotifyOAuth.authorizeURL({
            redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
            scope: 'user-read-private user-read-email playlist-read-private',
            state: 'randomstring',  // Asegúrate de usar una cadena única para evitar CSRF
        });
        console.log('authURL', authURL);
        res.redirect(authURL);
    } catch (error) {
        console.error('Error al iniciar sesion con Spotify', error.message);
        res.status(500).json({ error: 'Error de con' });
    }
};

export const callback = async (req, res) => {
    const db = await getConnection();
    const code = req.query.code;

    if (!code) {
        return res.status(400).json({ error: 'Authorization code not provided' });
    }
    try {
        // Paso 1: Intercambiar el código por tokens (access_token y refresh_token)
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
        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // Paso 2: Usar el access_token para obtener el ID del usuario de Spotify
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${access_token}`,
            },
        });

        const spotifyId = userResponse.data.id; // ID de usuario de Spotify

        // Paso 3: Crear un nuevo objeto con los datos de Spotify
        const spotifyData = {
            spotify_id: spotifyId, // ID de usuario de Spotify
            access_token,
            refresh_token,
            expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        };
        const collection = db.collection('users'); // Asegúrate de que 'users' sea el nombre de tu colección


        // Primero, intenta encontrar al usuario
        const user = await collection.findOne({ 'platforms.spotify.spotify_id': spotifyId });

        if (user) {
            // Si el usuario existe, actualiza solo la subpropiedad spotify
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
            // Si el usuario no existe, crea uno nuevo con los datos de Spotify
            const user = await collection.insertOne({
                user_id: spotifyId,
                platforms: {
                    spotify: spotifyData,
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Redirigir o enviar la respuesta al frontend
        res.redirect('/youtube/autenticate'); // Cambiar según tus rutas
    } catch (error) {
        console.error('Error al autenticar con Spotify:', error);
        res.status(500).json({ message: 'Error al autenticar con Spotify' });
    }
};