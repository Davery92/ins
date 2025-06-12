"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.changeUserPassword = exports.createUser = exports.deactivateUser = exports.activateUser = exports.getCompanyUsers = void 0;
const models_1 = require("../models");
const bcrypt_1 = __importDefault(require("bcrypt"));
/**
 * Get all users within the admin's company
 */
const getCompanyUsers = async (req, res) => {
    try {
        if (!req.user?.companyId) {
            res.status(400).json({ error: 'Admin must belong to a company' });
            return;
        }
        const users = await models_1.UserModel.findAll({
            where: { companyId: req.user.companyId },
            attributes: ['id', 'email', 'firstName', 'lastName', 'status', 'role', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });
        // Get company info for license counts
        const company = await models_1.CompanyModel.findByPk(req.user.companyId, {
            attributes: ['licenseCount']
        });
        const activeLicenses = users.filter(user => user.status === 'active').length;
        const availableLicenses = company ? company.licenseCount - activeLicenses : 0;
        res.json({
            users: users.map(user => ({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status,
                role: user.role,
                createdAt: user.createdAt
            })),
            licenseInfo: {
                total: company?.licenseCount || 0,
                used: activeLicenses,
                available: Math.max(0, availableLicenses)
            }
        });
    }
    catch (error) {
        console.error('Failed to get company users:', error);
        res.status(500).json({ error: 'Failed to retrieve users' });
    }
};
exports.getCompanyUsers = getCompanyUsers;
/**
 * Activate a user (assign a license)
 */
const activateUser = async (req, res) => {
    const { userId } = req.params;
    try {
        if (!req.user?.companyId) {
            res.status(400).json({ error: 'Admin must belong to a company' });
            return;
        }
        // Find the user and ensure they belong to the same company
        const user = await models_1.UserModel.findOne({
            where: { id: userId, companyId: req.user.companyId }
        });
        if (!user) {
            res.status(404).json({ error: 'User not found or not in your company' });
            return;
        }
        if (user.status === 'active') {
            res.status(400).json({ error: 'User is already active' });
            return;
        }
        // Check if there are available licenses
        const company = await models_1.CompanyModel.findByPk(req.user.companyId);
        if (!company) {
            res.status(404).json({ error: 'Company not found' });
            return;
        }
        const activeLicenses = await models_1.UserModel.count({
            where: { companyId: req.user.companyId, status: 'active' }
        });
        if (activeLicenses >= company.licenseCount) {
            res.status(400).json({ error: 'No available licenses. Please contact support to purchase more.' });
            return;
        }
        // Activate the user
        user.status = 'active';
        await user.save();
        res.json({
            message: 'User activated successfully',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Failed to activate user:', error);
        res.status(500).json({ error: 'Failed to activate user' });
    }
};
exports.activateUser = activateUser;
/**
 * Deactivate a user (revoke license)
 */
const deactivateUser = async (req, res) => {
    const { userId } = req.params;
    try {
        if (!req.user?.companyId) {
            res.status(400).json({ error: 'Admin must belong to a company' });
            return;
        }
        // Find the user and ensure they belong to the same company
        const user = await models_1.UserModel.findOne({
            where: { id: userId, companyId: req.user.companyId }
        });
        if (!user) {
            res.status(404).json({ error: 'User not found or not in your company' });
            return;
        }
        if (user.status === 'disabled') {
            res.status(400).json({ error: 'User is already deactivated' });
            return;
        }
        // Deactivate the user
        user.status = 'disabled';
        await user.save();
        res.json({
            message: 'User deactivated successfully',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Failed to deactivate user:', error);
        res.status(500).json({ error: 'Failed to deactivate user' });
    }
};
exports.deactivateUser = deactivateUser;
/**
 * Create a new user within the admin's company
 */
const createUser = async (req, res) => {
    const { email, firstName, lastName, password } = req.body;
    try {
        if (!req.user?.companyId) {
            res.status(400).json({ error: 'Admin must belong to a company' });
            return;
        }
        // Validate required fields
        if (!email || !firstName || !lastName || !password) {
            res.status(400).json({ error: 'All fields are required: email, firstName, lastName, password' });
            return;
        }
        // Validate password length
        if (password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters long' });
            return;
        }
        // Get admin's company
        const company = await models_1.CompanyModel.findByPk(req.user.companyId);
        if (!company) {
            res.status(404).json({ error: 'Company not found' });
            return;
        }
        // Validate email domain matches company domain
        const emailDomain = email.split('@')[1];
        if (!emailDomain || emailDomain !== company.domain) {
            res.status(400).json({
                error: `Email domain must match company domain: ${company.domain}`
            });
            return;
        }
        // Check if user already exists
        const existingUser = await models_1.UserModel.findOne({ where: { email } });
        if (existingUser) {
            res.status(400).json({ error: 'User with this email already exists' });
            return;
        }
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt_1.default.hash(password, saltRounds);
        // Create the user
        const user = await models_1.UserModel.create({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            status: 'pending', // New users start as pending
            role: 'user',
            companyId: req.user.companyId
        });
        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status,
                role: user.role,
                companyId: user.companyId,
                createdAt: user.createdAt
            }
        });
    }
    catch (error) {
        console.error('Failed to create user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};
exports.createUser = createUser;
/**
 * Change a user's password within the admin's company
 */
const changeUserPassword = async (req, res) => {
    const { userId } = req.params;
    const { newPassword } = req.body;
    try {
        if (!req.user?.companyId) {
            res.status(400).json({ error: 'Admin must belong to a company' });
            return;
        }
        // Validate required fields
        if (!newPassword) {
            res.status(400).json({ error: 'New password is required' });
            return;
        }
        // Validate password length
        if (newPassword.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters long' });
            return;
        }
        // Find the user and ensure they belong to the same company
        const user = await models_1.UserModel.findOne({
            where: { id: userId, companyId: req.user.companyId }
        });
        if (!user) {
            res.status(404).json({ error: 'User not found or not in your company' });
            return;
        }
        // Hash new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt_1.default.hash(newPassword, saltRounds);
        // Update user password
        user.password = hashedPassword;
        await user.save();
        res.json({
            message: 'Password changed successfully',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Failed to change user password:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
};
exports.changeUserPassword = changeUserPassword;
/**
 * Delete a user within the admin's company
 */
const deleteUser = async (req, res) => {
    const { userId } = req.params;
    try {
        if (!req.user?.companyId) {
            res.status(400).json({ error: 'Admin must belong to a company' });
            return;
        }
        // Find the user and ensure they belong to the same company
        const user = await models_1.UserModel.findOne({
            where: { id: userId, companyId: req.user.companyId }
        });
        if (!user) {
            res.status(404).json({ error: 'User not found or not in your company' });
            return;
        }
        // Prevent deleting admin users
        if (user.role === 'admin') {
            res.status(400).json({ error: 'Cannot delete admin users' });
            return;
        }
        // Delete the user
        await user.destroy();
        res.json({
            message: 'User deleted successfully',
            deletedUser: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    }
    catch (error) {
        console.error('Failed to delete user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};
exports.deleteUser = deleteUser;
//# sourceMappingURL=adminController.js.map