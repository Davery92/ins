import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { isAdmin } from '../middleware/isAdmin';
import { isGlobalAdmin } from '../middleware/isGlobalAdmin';
import { getAllCompanies, updateCompanyLicenses, createAdminForCompany, createCompany } from '../controllers/sysadminController';

const router = Router();

// All sysadmin routes require authentication, admin role, and global admin
router.use(authenticateToken);
router.use(isAdmin);
router.use(isGlobalAdmin);

/**
 * @route   GET /api/sysadmin/companies
 * @desc    Get all companies, their admin accounts, and license usage
 * @access  Private (Global Admin)
 */
router.get('/companies', getAllCompanies);

/**
 * @route   POST /api/sysadmin/companies
 * @desc    Create a new company (Global Admin)
 * @access  Private (Global Admin)
 */
router.post('/companies', createCompany);

/**
 * @route   PATCH /api/sysadmin/companies/:companyId/licenses
 * @desc    Update license count for a company (delta)
 * @access  Private (Global Admin)
 */
router.patch('/companies/:companyId/licenses', updateCompanyLicenses);

/**
 * @route   POST /api/sysadmin/companies/:companyId/admins
 * @desc    Create or promote an admin user for a company
 * @access  Private (Global Admin)
 */
router.post('/companies/:companyId/admins', createAdminForCompany);

export default router; 