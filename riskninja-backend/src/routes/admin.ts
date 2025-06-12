import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { isAdmin } from '../middleware/isAdmin';
import { getCompanyUsers, activateUser, deactivateUser, createUser, changeUserPassword, deleteUser } from '../controllers/adminController';

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

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user within the admin's company
 * @access  Private (Admin)
 */
router.post('/users', createUser);

/**
 * @route   PATCH /api/admin/users/:userId/password
 * @desc    Change a user's password
 * @access  Private (Admin)
 */
router.patch('/users/:userId/password', changeUserPassword);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete a user from the company
 * @access  Private (Admin)
 */
router.delete('/users/:userId', deleteUser);

export default router; 