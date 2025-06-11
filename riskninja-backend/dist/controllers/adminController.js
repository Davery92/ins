"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivateUser = exports.activateUser = exports.getCompanyUsers = void 0;
const models_1 = require("../models");
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
//# sourceMappingURL=adminController.js.map