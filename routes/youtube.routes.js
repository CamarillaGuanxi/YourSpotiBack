import { Router } from 'express';
import { autentication_youtube, callback, update_data, getPlaylists, migrate } from '../controller/youtube.controller.js';
const router = Router();
router.get('/autentication/:idSpoty', autentication_youtube);
router.get('/callback', callback);
router.put('/update-user-data/:idSpoty', update_data);
router.get('/playlists', getPlaylists)
router.post('/playlists/migration', migrate)

export default router;

