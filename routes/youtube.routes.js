import { Router } from 'express';
import { callback } from '../controller/youtube.user.controller.js';
import { getPlaylists, migrate } from '../controller/youtube.playlist.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: YouTube
 *   description: Rutas relacionadas con YouTube
 */

/**
 * @swagger
 * /youtube/callback:
 *   get:
 *     summary: Callback de autenticación de YouTube
 *     tags: [YouTube]
 *     description: Maneja el callback después de la autenticación con YouTube.
 *     responses:
 *       200:
 *         description: Autenticación exitosa.
 *       400:
 *         description: Código de autorización no proporcionado.
 *       500:
 *         description: Error al autenticar con YouTube.
 */
router.get('/callback', callback);

/**
 * @swagger
 * /youtube/playlists:
 *   get:
 *     summary: Obtener playlists de YouTube
 *     tags: [YouTube]
 *     description: Devuelve las playlists del usuario autenticado en YouTube.
 *     responses:
 *       200:
 *         description: Listado de playlists obtenido exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   kind:
 *                     type: string
 *                     example: youtube#playlist
 *                   etag:
 *                     type: string
 *                     example: Z75-3b5MCGERmoC_IDylS3kDACA
 *                   id:
 *                     type: string
 *                     example: PLE7NO1e1S6GixIJJ6mxnOD5Hf6AOgIlXC
 *                   snippet:
 *                     type: object
 *                     properties:
 *                       publishedAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-04-10T15:23:23.381787Z
 *                       channelId:
 *                         type: string
 *                         example: UCFixJbWndwYHKnujadJ4pRQ
 *                       title:
 *                         type: string
 *                         example: La playlist del averno
 *                       description:
 *                         type: string
 *                         example: ""
 *                       thumbnails:
 *                         type: object
 *                         additionalProperties: true
 *                       channelTitle:
 *                         type: string
 *                         example: Valentino
 *                       localized:
 *                         type: object
 *                         additionalProperties: true
 *       404:
 *         description: Usuario no encontrado.
 *       500:
 *         description: Error al obtener las playlists.
 */
router.get('/playlists', getPlaylists);

/**
 * @swagger
 * /youtube/playlists/migration:
 *   post:
 *     summary: Migrar playlists de YouTube a Spotify
 *     tags: [YouTube]
 *     description: Migra una playlist de YouTube a Spotify.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: ID de la playlist de YouTube.
 *               name:
 *                 type: string
 *                 description: Nombre de la playlist.
 *               description:
 *                 type: string
 *                 description: Descripción de la playlist.
 *     responses:
 *       200:
 *         description: Playlist migrada exitosamente.
 *       404:
 *         description: Usuario o playlist no encontrado.
 *       500:
 *         description: Error durante la migración.
 */
router.post('/playlists/migration', migrate);

export default router;

