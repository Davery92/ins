import { Router } from 'express';
import { register, login, getProfile, registerAdmin } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/register-admin', registerAdmin);
router.post('/login', login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);

export default router; 