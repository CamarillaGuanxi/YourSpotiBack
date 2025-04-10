
import { getConnection } from '../db/dbconfig.js';
import axios, { all } from 'axios';
import { googleOAuth } from '../config.js';
import { config } from 'dotenv';
config();

export const autentication_youtube = async (req, res, idSpoty) => {
    try {
        const authURL = await googleOAuth.authorizeURL({
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            scope: 'openid email profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtubepartner',
            state: JSON.stringify({ idSpoty }),
        });
        await res.redirect(authURL);
    } catch (error) {
        console.error('Error al iniciar sesion con Youtube', error.message);
        res.status(500).json({ error: 'Error de con' });
    }
}

export const callback = async (req, res) => {
    const { code, state } = req.query;
    // Intercambiar el código por el access_token
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

        const body = tokenResponse;
        let parsedState = JSON.parse(state);
        let spotifyId = parsedState.idSpoty;
        await update_data(req, res, body, spotifyId); // Asegúrate de que el estado contenga el idSpoty

    } catch (error) {
        console.error('Error al autenticar con Youtube:', error);
        res.status(500).json({ message: 'Error al autenticar con Youtube' });
    }
}
export const update_data = async (req, res, body, idSpoty) => {
    const { access_token, refresh_token, expires_in } = body.data; // Asegúrate de que el cuerpo de la solicitud contenga estos datos
    const db = await getConnection();

    console.log("refresh", refresh_token)
    try {
        // Usar el access_token para obtener el ID del usuario de YouTube
        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
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
        const user = await collection.findOne({ 'user_id': idSpoty });

        if (user) {
            // Si el usuario existe, actualiza solo la subpropiedad spotify
            const result = await collection.updateOne(
                { user_id: idSpoty }, // Buscar por el ID de usuario
                {
                    $set: {
                        [`platforms.youtube`]: youtubeData, // Sobrescribe los datos de YouTube
                        updated_at: new Date().toISOString(),
                    },
                }
            );
            if (req.cookies.user_id) {
                res.clearCookie('user_id'); // Limpiar la cookie existente
            }
            res.cookie('user_id', idSpoty, {
                httpOnly: true,      // Protege la cookie de accesos desde JS en el navegador
                secure: true,        // Requiere HTTPS en producción
                maxAge: 60 * 60 * 1000, // Expira en 7 días
                sameSite: 'Strict',  // Previene ataques CSRF
            });
            console.log('Result', result);
            return res.redirect('http://localhost:5173/#/selector'); // Cambia según tus rutas
        } else {
            res.redirect('/spotify/autenticate'); // Cambiar según tus rutas
        }
        res.status(200).json({ message: 'Datos de YouTube actualizados correctamente' });
    } catch (error) {
        console.error('Error al autenticar con Spotify:', error);
        res.status(500).json({ message: 'Error al autenticar con Spotify' });
    }
}

export const getPlaylists = async (req, res) => {
    const db = await getConnection();
    const user_id = req.cookies.user_id;

    try {
        const userData = await db.collection('users').findOne({ user_id });

        if (!userData) {
            return res.status(404).json({ message: 'User not found' });
        }

        const youtubeData = userData.platforms?.youtube;

        if (!youtubeData) {
            return res.status(404).json({ message: 'YouTube data not found' });
        }

        const accessToken = youtubeData.access_token;

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

            console.log('Página obtenida:', response.data.items.length, 'playlists');
            console.log('Token de la próxima página:', response.data.nextPageToken);

            const { items, nextPageToken: newToken } = response.data;
            allPlaylists = allPlaylists.concat(items);
            nextPageToken = newToken;

        } while (nextPageToken);
        console.log('allPlaylists', allPlaylists);
        res.status(200).json(allPlaylists);

    } catch (error) {
        console.error('Error al obtener las listas de reproducción de YouTube:', error.response?.data || error.message);
        res.status(500).json({ message: 'Error al obtener las listas de reproducción de YouTube' });
    }
};

export const migrate = async (req, res) => {
    const { id, name, description } = req.body;
    const userLogged = await req.cookies.user_id; //await req.cookies.user_id;
    //await req.cookies.user_id;
    const db = await getConnection();
    try {
        const user = await db.collection('users').findOne({ user_id: userLogged });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const tokenSpoty = user.platforms.spotify.access_token; // ID de usuario de Spotify

        const tokenYoutube = user.platforms.youtube.access_token; // ID de usuario de Youtube
        const playlists = await getPlaylistItems(id, tokenYoutube); // ID de la lista de reproducción de Spotify
        if (!playlists) {
            return res.status(404).json({ message: 'Playlists not found' });
        }
        const spotifyPlaylist = await axios.post(
            `https://api.spotify.com/v1/users/${userLogged}/playlists`,
            {
                "name": name,
                "description": description,
                "public": true,
            },
            {
                headers: {
                    'Authorization': `Bearer ${tokenSpoty}`, // Usa el access_token aquí
                    'Content-Type': 'application/json',
                },
            }
        );
        if (!playlists) {
            return res.status(404).json({ message: 'Playlists not found' });
        }
        if (!spotifyPlaylist || !spotifyPlaylist.data || !spotifyPlaylist.data.id) {
            return res.status(404).json({ message: 'No se pudo crear la lista de reproducción de Spotify' });
        }
        const allTracks = new Set();


        for (const item of playlists) {
            const videoId = item.id;
            const videoName = cleanVideoTitle(item.snippet.title);;
            const videoArtist = item.snippet.videoOwnerChannelTitle;
            console.log(item.id);

            console.log(`Migrando pista: ${videoId} por ${videoName} (ID: ${videoArtist})`);

            try {
                const searchResponse = await searchSpotifyTrack(videoName, tokenSpoty);
                console.log(searchResponse) // Cambia esto para buscar en Spotify
                if (searchResponse && searchResponse.length > 0) {
                    const track = getClosestTrack(searchResponse, videoName);
                    const trackName = track.name;
                    const trackId = track.id;
                    const uri = track.uri;
                    console.log(trackName)
                    // Verificamos si el video ya fue agregado
                    if (allTracks.has(uri)) {
                        console.log(`Ya se ha agregado la cancion con: ${uri}`);
                        continue;
                    }
                    allTracks.add(uri);
                    console.log(`Pista agregada a Spotify: ${videoName} por ${videoArtist}`);

                } else {
                    console.log(`No se encontró la canción en Spotify: ${videoName} por ${videoArtist}`);
                }
            } catch (error) {
                console.error(`Error al procesar la pista: ${videoName} por ${videoArtist}`, error.message);
            }
        }

        await axios.post(
            `https://api.spotify.com/v1/playlists/${spotifyPlaylist.data.id}/tracks`,
            {
                uris: Array.from(allTracks),
                position: 0
            },
            {
                headers: {
                    'Authorization': `Bearer ${tokenSpoty}`, // Usa el access_token aquí
                },
            }
        );

        return res.status(200).json({ message: 'Playlist migrada a YouTube exitosamente' })

    } catch (error) {
        console.error('Error al obtener las listas de reproducción de Spotify o youtube:', error);
        res.status(500).json({ message: 'Error al obtener las listas de reproducción de Spotify' });
    }

}

const getPlaylistItems = async (playlistId, tokenYoutube) => {
    let nextPageToken = null;
    const allItems = [];

    do {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
            params: {
                part: 'snippet',
                maxResults: 50, // máximo permitido
                playlistId: playlistId,
                key: process.env.YOUTUBE_API_KEY,
                pageToken: nextPageToken,

            },
            headers: {
                'Authorization': `Bearer ${tokenYoutube}`, // Usa el access_token aquí
                'Content-Type': 'application/json',
            },
        });

        const items = response.data.items;
        allItems.push(...items);
        nextPageToken = response.data.nextPageToken;

    } while (nextPageToken);

    return allItems;
};
const searchSpotifyTrack = async (query, token) => {
    const response = await axios.get('https://api.spotify.com/v1/search', {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        params: {
            q: query,
            type: 'track',
            limit: 5, // podés ajustar esto
        },
    });

    return response.data.tracks.items;
};

const getClosestTrack = (tracks, query) => {
    let closestTrack = null;
    let minDistance = Infinity;

    tracks.forEach(track => {
        const trackName = track.name.toLowerCase();
        const distance = getLevenshteinDistance(trackName, query.toLowerCase());
        if (distance < minDistance) {
            minDistance = distance;
            closestTrack = track;
        }
    });

    return closestTrack;
};
function getLevenshteinDistance(a, b) {
    const tmp = [];
    let i, j, alen = a.length, blen = b.length, cost;

    if (alen === 0) return blen;
    if (blen === 0) return alen;

    for (i = 0; i <= alen; i++) tmp[i] = [i];

    for (j = 0; j <= blen; j++) tmp[0][j] = j;

    for (i = 1; i <= alen; i++) {
        for (j = 1; j <= blen; j++) {
            cost = (a[i - 1] === b[j - 1]) ? 0 : 1;
            tmp[i][j] = Math.min(tmp[i - 1][j] + 1, tmp[i][j - 1] + 1, tmp[i - 1][j - 1] + cost);
        }
    }
    return tmp[alen][blen];

}

function cleanVideoTitle(title) {
    // Eliminar cualquier cosa entre paréntesis o corchetes (como " (Official Video)", " [PROD. MANI DEÏZ]")
    let cleanedTitle = title.replace(/\(.*?\)|\[.*?\]/g, "");

    // Eliminar los emojis (que generalmente no son parte del nombre de la canción)
    cleanedTitle = cleanedTitle.replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, "");

    // Eliminar espacios extra al inicio y final
    cleanedTitle = cleanedTitle.trim();

    return cleanedTitle;
}