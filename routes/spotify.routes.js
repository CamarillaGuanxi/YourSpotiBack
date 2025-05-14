import { Router } from 'express';
import { getPlaylists, migrate } from '../controller/spotify.playlist.controller.js';
import { callback } from '../controller/spotify.user.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Spotify
 *   description: Rutas relacionadas con Spotify
 */

/**
 * @swagger
 * /spotify/callback:
 *   get:
 *     summary: Callback de autenticación de Spotify
 *     tags: [Spotify]
 *     description: Maneja el callback después de la autenticación con Spotify.
 *     responses:
 *       200:
 *         description: Autenticación exitosa.
 *       400:
 *         description: Código de autorización no proporcionado.
 *       500:
 *         description: Error al autenticar con Spotify.
 */
router.get('/callback', callback);

/**
 * @swagger
 * /spotify/playlists:
 *   get:
 *     summary: Obtener playlists de Spotify
 *     tags: [Spotify]
 *     description: Devuelve las playlists del usuario autenticado en Spotify.
 *     responses:
 *       200:
 *         description: Listado de playlists obtenido exitosamente.
 *         content:
 *           application/json:
 *             example:
 *               href: 'https://api.spotify.com/v1/users/zc56yk2od634moirtmy1mvzdi/playlists?offset=0&limit=50'
 *               limit: 50
 *               next: 'https://api.spotify.com/v1/users/zc56yk2od634moirtmy1mvzdi/playlists?offset=50&limit=50'
 *               offset: 0
 *               previous: null
 *               total: 70
 *               items:
 *                 - collaborative: false
 *                   description: ''
 *                   href: 'https://api.spotify.com/v1/playlists/0vxjMDko80IKzv0PobZiXE'
 *                   id: '0vxjMDko80IKzv0PobZiXE'
 *                   name: 'Psicho'
 *                   public: true
 *                   snapshot_id: 'AAAAAjsxg83CKFhDxaS9pW32tQ1G5lFb'
 *                   type: 'playlist'
 *                   uri: 'spotify:playlist:0vxjMDko80IKzv0PobZiXE'
 *       404:
 *         description: Usuario no encontrado.
 *       500:
 *         description: Error al obtener las playlists.
 */
router.get('/playlists', getPlaylists);

/**
 * @swagger
 * /spotify/playlists/migration:
 *   post:
 *     summary: Migrar playlists de Spotify a YouTube
 *     tags: [Spotify]
 *     description: Migra una playlist de Spotify a YouTube.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: ID de la playlist de Spotify.
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