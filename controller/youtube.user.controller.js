import { getConnection } from '../db/dbconfig.js';
import axios from 'axios';
import { googleOAuth, encrypt } from '../config.js';
import { config } from 'dotenv';

config();

export const authentication_youtube = async (req, res, spotifyId) => {
    try {
        const authURL = googleOAuth.authorizeURL({
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            scope: 'openid email profile https://www.googleapis.com/auth/youtube',
            state: JSON.stringify({ spotifyId }),
        });

        res.redirect(authURL);
    } catch (error) {
        console.error('Error al iniciar sesión con YouTube:', error.message);
        res.status(500).json({ error: 'Error de autenticación con YouTube' });
    }
};

export const callback = async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
        return res.status(400).json({ error: 'Authorization code not provided' });
    }

    try {
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', null, {
            params: {
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
            },
        });

        const { spotifyId } = JSON.parse(state);
        await updateYouTubeData(req, res, tokenResponse.data, spotifyId);
    } catch (error) {
        console.error('Error al autenticar con YouTube:', error.message);
        res.status(500).json({ message: 'Error al autenticar con YouTube' });
    }
};

const updateYouTubeData = async (req, res, tokenData, spotifyId) => {
    const { access_token, expires_in } = tokenData;
    const db = await getConnection();

    try {
        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        const youtubeData = {
            youtube_id: userInfo.data.id,
            email: userInfo.data.email,
            access_token: await encrypt(access_token),
            expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        };

        const collection = db.collection('users');
        const user = await collection.findOne({ user_id: spotifyId });

        if (user) {
            await collection.updateOne(
                { user_id: spotifyId },
                { $set: { 'platforms.youtube': youtubeData, updated_at: new Date().toISOString() } }
            );

            res.cookie('user_id', await encrypt(spotifyId), {
                httpOnly: true,
                secure: true,
                maxAge: 60 * 60 * 1000,
                sameSite: 'Strict',
            });

            res.redirect(`${process.env.FRONT}/#/selector`);
        } else {
            res.redirect('/spotify/authenticate');
        }
    } catch (error) {
        console.error('Error al actualizar datos de YouTube:', error.message);
        res.status(500).json({ message: 'Error al actualizar datos de YouTube' });
    }
};
