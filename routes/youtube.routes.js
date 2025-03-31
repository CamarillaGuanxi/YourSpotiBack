import { Router } from 'express';
import { autentication, callback } from '../controller/youtube.controller.js';
const router = Router();
router.get('/autentication/:idSpoty', autentication);
router.put('/callback/:idSpoty', callback);

export default router;