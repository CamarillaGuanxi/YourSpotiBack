import { getConnection } from '../db/dbconfig.js';
import { encrypt } from '../config.js';
import { authentication_youtube } from './youtube.user.controller.js';
import axios from 'axios';
import { spotifyOAuth } from '../config.js';
import { config } from 'dotenv';
config();
export const authentication_sp = async (req, res) => {
    try {
        const authURL = spotifyOAuth.authorizeURL({
            redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
            scope: 'user-read-private user-read-email playlist-read-private playlist-modify-public playlist-modify-private',
            state: 'randomstring',
        });
        res.status(200).json({ authURL });
    } catch (error) {
        console.error('Error al iniciar sesion con Spotify', error.message);
        res.status(500).json({ error: 'Error de conexión' });
    }
};

export const callback = async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).json({ error: 'Authorization code not provided' });
    }

    try {
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
        await update_user_data(req, res, tokenResponse.data);
    } catch (error) {
        console.error('Error al autenticar con Spotify:', error);
        res.status(500).json({ message: 'Error al autenticar con Spotify' });
    }
};

const update_user_data = async (req, res, body) => {
    const db = await getConnection();
    const { access_token, refresh_token, expires_in } = body;

    try {
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${access_token}` },
        });

        const spotifyId = userResponse.data.id;
        const spotifyData = {
            spotify_id: spotifyId,
            access_token: (await encrypt(access_token.toString())).toString(),
            refresh_token: (await encrypt(refresh_token.toString())).toString(),
            expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        };

        const collection = db.collection('users');
        const user = await collection.findOne({ 'platforms.spotify.spotify_id': spotifyId });

        if (user) {
            await collection.updateOne({ 'platforms.spotify.spotify_id': spotifyId }, {
                $set: { 'platforms.spotify': spotifyData, updated_at: new Date().toISOString() },
            });
        } else {
            await collection.insertOne({
                user_id: spotifyId,
                platforms: { spotify: spotifyData },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
        }

        return authentication_youtube(req, res, spotifyId); // YouTube authentication flow
    } catch (error) {
        console.error('Error al autenticar con Spotify:', error);
        return res.status(500).json({ message: 'Error al autenticar con Spotify' });
    }
};
