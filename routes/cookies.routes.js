import { Router } from 'express';
import { checkCookies } from '../controller/cookies.controller.js';
const router = Router();
router.get('/', checkCookies);

export default router;