import { Router } from 'express';
import { getChatHistory, saveChatMessage, clearChatHistory, getChatStats } from '../controllers/chatController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All chat routes require authentication
router.use(authenticateToken);

router.get('/history', getChatHistory);
router.post('/message', saveChatMessage);
router.delete('/history', clearChatHistory);
router.get('/stats', getChatStats);

export default router; 