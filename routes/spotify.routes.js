import { Router } from 'express';
import { autentication } from '../controller/spotify.controller.js';
const router = Router();
router.get('/autentication', autentication);

export default router;