import { Router } from 'express';
import { autentication, callback } from '../controller/spotify.controller.js';
const router = Router();
router.get('/autentication', autentication);
router.put('/callback', callback);

export default router;