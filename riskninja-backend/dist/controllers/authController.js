"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.registerAdmin = exports.getProfile = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const register = async (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    try {
        // Validate required fields
        if (!email || !password || !firstName || !lastName) {
            res.status(400).json({ error: 'All fields are required' });
            return;
        }
        // Check if user already exists
        const existingUser = await models_1.UserModel.findOne({ where: { email } });
        if (existingUser) {
            res.status(400).json({ error: 'User already exists' });
            return;
        }
        // Extract domain from email
        const emailDomain = email.split('@')[1];
        if (!emailDomain) {
            res.status(400).json({ error: 'Invalid email format' });
            return;
        }
        // Find company by domain
        const company = await models_1.CompanyModel.findOne({ where: { domain: emailDomain } });
        if (!company) {
            res.status(400).json({
                error: 'No company found for your email domain. Please contact your administrator.'
            });
            return;
        }
        // Hash password
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        // Create user
        const user = await models_1.UserModel.create({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            status: 'pending', // New users start as pending
            role: 'user',
            companyId: company.id
        });
        res.status(201).json({
            message: 'User registered successfully. Please wait for admin approval.',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status,
                role: user.role,
                companyId: user.companyId
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        // Find user
        const user = await models_1.UserModel.findOne({ where: { email } });
        if (!user) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }
        // Verify password
        const isValidPassword = await bcrypt_1.default.compare(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }
        // Generate JWT token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET not configured');
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' });
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status,
                role: user.role,
                companyId: user.companyId,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.login = login;
const getProfile = async (req, res) => {
    try {
        // User is already available from auth middleware
        res.json({
            user: req.user,
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getProfile = getProfile;
// Admin registration: create company and admin user
const registerAdmin = async (req, res) => {
    const { companyName, domain, email, password, firstName, lastName } = req.body;
    if (!companyName || !domain || !email || !password || !firstName || !lastName) {
        res.status(400).json({ error: 'All fields are required for admin registration.' });
        return;
    }
    const transaction = await models_1.sequelize.transaction();
    try {
        // Find or create company by domain
        let company = await models_1.CompanyModel.findOne({ where: { domain }, transaction });
        if (!company) {
            company = await models_1.CompanyModel.create({ name: companyName, domain }, { transaction });
        }
        // Fetch JWT secret once
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret)
            throw new Error('JWT_SECRET not configured');
        // Check if a user with this email already exists
        let adminUser = await models_1.UserModel.findOne({ where: { email }, transaction });
        if (adminUser) {
            // Promote existing user to admin
            adminUser.firstName = firstName;
            adminUser.lastName = lastName;
            adminUser.role = 'admin';
            adminUser.status = 'active';
            adminUser.companyId = company.id;
            await adminUser.save({ transaction });
            await transaction.commit();
            res.status(200).json({
                message: 'User elevated to admin successfully.',
                token: jsonwebtoken_1.default.sign({ userId: adminUser.id, email: adminUser.email }, jwtSecret, { expiresIn: '7d' }),
                user: {
                    id: adminUser.id,
                    email: adminUser.email,
                    firstName: adminUser.firstName,
                    lastName: adminUser.lastName,
                    status: adminUser.status,
                    role: adminUser.role
                },
            });
            return;
        }
        // No existing user: create a new admin user
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt_1.default.hash(password, saltRounds);
        const newAdmin = await models_1.UserModel.create({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            companyId: company.id,
            role: 'admin',
            status: 'active',
        }, { transaction });
        await transaction.commit();
        res.status(201).json({
            message: 'Admin account and company created successfully.',
            token: jsonwebtoken_1.default.sign({ userId: newAdmin.id, email: newAdmin.email }, jwtSecret, { expiresIn: '7d' }),
            user: {
                id: newAdmin.id,
                email: newAdmin.email,
                firstName: newAdmin.firstName,
                lastName: newAdmin.lastName,
                status: newAdmin.status,
                role: newAdmin.role
            },
        });
    }
    catch (error) {
        await transaction.rollback();
        console.error('Admin registration error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
};
exports.registerAdmin = registerAdmin;
/**
 * Change authenticated user's password
 */
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        if (!req.user?.id) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        // Validate required fields
        if (!currentPassword || !newPassword) {
            res.status(400).json({ error: 'Current password and new password are required' });
            return;
        }
        // Validate new password length
        if (newPassword.length < 6) {
            res.status(400).json({ error: 'New password must be at least 6 characters long' });
            return;
        }
        // Find the user
        const user = await models_1.UserModel.findByPk(req.user.id);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        // Verify current password
        const isValidCurrentPassword = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!isValidCurrentPassword) {
            res.status(400).json({ error: 'Current password is incorrect' });
            return;
        }
        // Hash new password
        const saltRounds = 12;
        const hashedNewPassword = await bcrypt_1.default.hash(newPassword, saltRounds);
        // Update user password
        user.password = hashedNewPassword;
        await user.save();
        res.json({
            message: 'Password changed successfully'
        });
    }
    catch (error) {
        console.error('Failed to change password:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
};
exports.changePassword = changePassword;
//# sourceMappingURL=authController.js.map