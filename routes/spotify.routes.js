import { Router } from 'express';
import { autentication, callback, update_data, getPlaylists, migrate } from '../controller/spotify.controller.js';
const router = Router();
router.get('/autentication', autentication);
router.get('/callback', callback);
router.put('/update-user-data', update_data);
router.get('/playlists', getPlaylists)
router.post('/playlists/migration', migrate);
export default router;