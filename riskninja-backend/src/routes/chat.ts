import { Router } from 'express';
import { getChatHistory, saveChatMessage, clearChatHistory, getChatStats } from '../controllers/chatController';
import { authenticateToken } from '../middleware/auth';
import { checkLicense } from '../middleware/checkLicense';

const router = Router();

// All chat routes require authentication
router.use(authenticateToken);
// All chat routes require an active license
router.use(checkLicense);

router.get('/history', getChatHistory);
router.post('/message', saveChatMessage);
router.delete('/history', clearChatHistory);
router.get('/stats', getChatStats);

export default router; 