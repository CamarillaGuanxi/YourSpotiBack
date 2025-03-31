
import { getConnection } from '../db/dbconfig.js';
import axios from 'axios';
import { googleOAuth } from '../config.js';
import { config } from 'dotenv';
config();

export const autentication = async (req, res) => {
    const idSpoty = req.params.idSpoty;
    try {
        const authURL = googleOAuth.authorizeURL({
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            scope: 'openid email profile https://www.googleapis.com/auth/youtube.readonly',
            state: JSON.stringify({ idSpoty }),
        });
        console.log('authURL', authURL);
        res.redirect(authURL);
    } catch (error) {
        console.error('Error al iniciar sesion con Youtube', error.message);
        res.status(500).json({ error: 'Error de con' });
    }
}
export const callback = async (req, res) => {
    const { code, state } = req.query;
    const db = await getConnection();
    if (!code) {
        return res.status(400).json({ error: 'Authorization code not provided' });
    }

    try {
        // Intercambiar el código por el access_token
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', null, {
            params: {
                code,
                client_id: process.env.YOUTUBE_CLIENT_ID,
                client_secret: process.env.YOUTUBE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
            },
        });

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // Usar el access_token para obtener el ID del usuario de YouTube
        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${access_token}`,
            },
        });

        const youtubeId = userResponse.data.id; // ID del usuario de YouTube
        const email = userResponse.data.email; // También puedes obtener el email si es necesario

        const youtubeData = {
            youtube_id: youtubeId,
            email,
            access_token,
            refresh_token,
            expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        };

        const collection = db.collection('users'); // Asegúrate de que 'users' sea el nombre de tu colección
        const user = await collection.findOne({ 'user_id': spotifyId });

        if (user) {
            // Si el usuario existe, actualiza solo la subpropiedad spotify
            const result = await collection.updateOne(
                { user_id: req.session.user_id }, // Buscar por el ID de usuario
                {
                    $set: {
                        [`platforms.youtube`]: youtubeData, // Sobrescribe los datos de YouTube
                        updated_at: new Date().toISOString(),
                    },
                }
            );

            res.cookie('user_id', idSpoty, {
                httpOnly: true,      // Protege la cookie de accesos desde JS en el navegador
                secure: true,        // Requiere HTTPS en producción
                maxAge: 7 * 24 * 60 * 60 * 1000, // Expira en 7 días
                sameSite: 'Strict',  // Previene ataques CSRF
            });
        } else {
            res.redirect('/spotify/autenticate'); // Cambiar según tus rutas
        }

    } catch (error) {
        console.error('Error al autenticar con Spotify:', error);
        res.status(500).json({ message: 'Error al autenticar con Spotify' });
    }
}