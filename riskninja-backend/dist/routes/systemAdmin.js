"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const isGlobalAdmin_1 = require("../middleware/isGlobalAdmin");
const systemAdminController_1 = require("../controllers/systemAdminController");
const router = (0, express_1.Router)();
// All system admin routes require authentication and global admin privileges
router.use(auth_1.authenticateToken);
router.use(isGlobalAdmin_1.isGlobalAdmin);
/**
 * @route   GET /api/system-admin/users
 * @desc    Get all users across all companies
 * @access  Private (System Admin)
 */
router.get('/users', systemAdminController_1.getAllUsers);
/**
 * @route   GET /api/system-admin/companies
 * @desc    Get all companies
 * @access  Private (System Admin)
 */
router.get('/companies', systemAdminController_1.getAllCompanies);
/**
 * @route   POST /api/system-admin/companies
 * @desc    Create a new company
 * @access  Private (System Admin)
 */
router.post('/companies', systemAdminController_1.createCompany);
/**
 * @route   PATCH /api/system-admin/companies/:companyId/licenses
 * @desc    Update license count for a company
 * @access  Private (System Admin)
 */
router.patch('/companies/:companyId/licenses', systemAdminController_1.updateCompanyLicenses);
exports.default = router;
//# sourceMappingURL=systemAdmin.js.map