import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { isGlobalAdmin } from '../middleware/isGlobalAdmin';
import { getAllUsers, getAllCompanies, createCompany, updateCompanyLicenses } from '../controllers/systemAdminController';

const router = Router();

// All system admin routes require authentication and global admin privileges
router.use(authenticateToken);
router.use(isGlobalAdmin);

/**
 * @route   GET /api/system-admin/users
 * @desc    Get all users across all companies
 * @access  Private (System Admin)
 */
router.get('/users', getAllUsers);

/**
 * @route   GET /api/system-admin/companies
 * @desc    Get all companies
 * @access  Private (System Admin)
 */
router.get('/companies', getAllCompanies);

/**
 * @route   POST /api/system-admin/companies
 * @desc    Create a new company
 * @access  Private (System Admin)
 */
router.post('/companies', createCompany);

/**
 * @route   PATCH /api/system-admin/companies/:companyId/licenses
 * @desc    Update license count for a company
 * @access  Private (System Admin)
 */
router.patch('/companies/:companyId/licenses', updateCompanyLicenses);

export default router; 