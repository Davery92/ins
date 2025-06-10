import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { isAdmin } from '../middleware/isAdmin';
import { getCompanyUsers, activateUser, deactivateUser } from '../controllers/adminController';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(isAdmin);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users within the admin's company
 * @access  Private (Admin)
 */
router.get('/users', getCompanyUsers);

/**
 * @route   PATCH /api/admin/users/:userId/activate
 * @desc    Activate a user (assign a license)
 * @access  Private (Admin)
 */
router.patch('/users/:userId/activate', activateUser);

/**
 * @route   PATCH /api/admin/users/:userId/deactivate
 * @desc    Deactivate a user (revoke license)
 * @access  Private (Admin)
 */
router.patch('/users/:userId/deactivate', deactivateUser);

export default router; 