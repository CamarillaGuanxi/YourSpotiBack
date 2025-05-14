import { AuthorizationCode } from 'simple-oauth2';
import { config } from 'dotenv';
import crypto from 'crypto';
import { text } from 'stream/consumers';

config();
export const spotifyOAuth = new AuthorizationCode({
    client: {
        id: process.env.SPOTIFY_CLIENT_ID,
        secret: process.env.SPOTIFY_CLIENT_SECRET,
    },
    auth: {
        tokenHost: 'https://accounts.spotify.com',
        authorizePath: '/authorize',
        tokenPath: '/api/token',
    },
});
export const googleOAuth = new AuthorizationCode({
    client: {
        id: process.env.GOOGLE_CLIENT_ID,
        secret: process.env.GOOGLE_CLIENT_SECRET,
    },
    auth: {
        tokenHost: 'https://accounts.google.com',
        authorizePath: '/o/oauth2/auth',
        tokenPath: '/oauth2/v4/token',
    },
});


export const encrypt = async (text) => {
    // Convertir IV y clave desde hex a Buffer
    const iv = Buffer.from(await process.env.CRYPTO_IV, 'hex');
    const key = Buffer.from(await process.env.CRYPTO_KEY, 'hex');

    // Crear el cifrador con el IV y la clave
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(text, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};

export const decrypt = async (encrypted) => {
    const iv = Buffer.from(await process.env.CRYPTO_IV, 'hex');
    const key = Buffer.from(await process.env.CRYPTO_KEY, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
};