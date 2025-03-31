import { Router } from 'express';

const router = Router();
router.get('cookies', checkCookies);

export default router;