import { Router } from 'express';
import { authentication_sp } from '../controller/spotify.user.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Rutas para la autenticación inicial
 */

/**
 * @swagger
 * /authentication:
 *   post:
 *     summary: Autenticación inicial con Spotify y YouTube
 *     tags: [Authentication]
 *     description: Genera la URL de autenticación para Spotify y YouTube.
 *     responses:
 *       200:
 *         description: URL de autenticación generada exitosamente.
 *       500:
 *         description: Error al generar la URL de autenticación.
 */
router.post('/', authentication_sp);

export default router;