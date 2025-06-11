"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const isAdmin_1 = require("../middleware/isAdmin");
const adminController_1 = require("../controllers/adminController");
const router = (0, express_1.Router)();
// All admin routes require authentication and admin role
router.use(auth_1.authenticateToken);
router.use(isAdmin_1.isAdmin);
/**
 * @route   GET /api/admin/users
 * @desc    Get all users within the admin's company
 * @access  Private (Admin)
 */
router.get('/users', adminController_1.getCompanyUsers);
/**
 * @route   PATCH /api/admin/users/:userId/activate
 * @desc    Activate a user (assign a license)
 * @access  Private (Admin)
 */
router.patch('/users/:userId/activate', adminController_1.activateUser);
/**
 * @route   PATCH /api/admin/users/:userId/deactivate
 * @desc    Deactivate a user (revoke license)
 * @access  Private (Admin)
 */
router.patch('/users/:userId/deactivate', adminController_1.deactivateUser);
exports.default = router;
//# sourceMappingURL=admin.js.map