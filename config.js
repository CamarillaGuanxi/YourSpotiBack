import { AuthorizationCode } from 'simple-oauth2';
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