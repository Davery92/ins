import { Router } from 'express';
import { assignLicenseToUser, getCompanyUsers } from '../controllers/adminController';
import { authenticateToken } from '../middleware/auth';
import { isAdmin } from '../middleware/isAdmin';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(isAdmin);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users for the admin's company
 * @access  Private (Admin)
 */
router.get('/users', getCompanyUsers);

/**
 * @route   PATCH /api/admin/users/:userId/assign-license
 * @desc    Assign a license to a user by activating their account
 * @access  Private (Admin)
 */
router.patch('/users/:userId/assign-license', assignLicenseToUser);

export default router; 