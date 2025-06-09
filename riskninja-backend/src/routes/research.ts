import { Router } from 'express';
import { generateResearchReport } from '../controllers/researchController';
// import { authenticateToken } from '../middleware/auth';

const router = Router();

// Research routes are public; skip authentication middleware

/**
 * @route   POST /api/research/generate
 * @desc    Generate a research report from a URL
 * @access  Public
 */
router.post('/generate', generateResearchReport);

export default router; 