"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const isAdmin_1 = require("../middleware/isAdmin");
const isGlobalAdmin_1 = require("../middleware/isGlobalAdmin");
const sysadminController_1 = require("../controllers/sysadminController");
const router = (0, express_1.Router)();
// All sysadmin routes require authentication, admin role, and global admin
router.use(auth_1.authenticateToken);
router.use(isAdmin_1.isAdmin);
router.use(isGlobalAdmin_1.isGlobalAdmin);
/**
 * @route   GET /api/sysadmin/companies
 * @desc    Get all companies, their admin accounts, and license usage
 * @access  Private (Global Admin)
 */
router.get('/companies', sysadminController_1.getAllCompanies);
/**
 * @route   POST /api/sysadmin/companies
 * @desc    Create a new company (Global Admin)
 * @access  Private (Global Admin)
 */
router.post('/companies', sysadminController_1.createCompany);
/**
 * @route   PATCH /api/sysadmin/companies/:companyId/licenses
 * @desc    Update license count for a company (delta)
 * @access  Private (Global Admin)
 */
router.patch('/companies/:companyId/licenses', sysadminController_1.updateCompanyLicenses);
/**
 * @route   POST /api/sysadmin/companies/:companyId/admins
 * @desc    Create or promote an admin user for a company
 * @access  Private (Global Admin)
 */
router.post('/companies/:companyId/admins', sysadminController_1.createAdminForCompany);
exports.default = router;
//# sourceMappingURL=sysadmin.js.map