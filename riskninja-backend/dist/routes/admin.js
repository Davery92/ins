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
/**
 * @route   POST /api/admin/users
 * @desc    Create a new user within the admin's company
 * @access  Private (Admin)
 */
router.post('/users', adminController_1.createUser);
/**
 * @route   PATCH /api/admin/users/:userId/password
 * @desc    Change a user's password
 * @access  Private (Admin)
 */
router.patch('/users/:userId/password', adminController_1.changeUserPassword);
/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete a user from the company
 * @access  Private (Admin)
 */
router.delete('/users/:userId', adminController_1.deleteUser);
exports.default = router;
//# sourceMappingURL=admin.js.map