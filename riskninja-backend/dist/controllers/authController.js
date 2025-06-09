"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.login = exports.register = void 0;
const bcrypt = require('bcryptjs');
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        // Validate input
        if (!email || !password || !firstName || !lastName) {
            res.status(400).json({ error: 'All fields are required' });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters' });
            return;
        }
        // Check if user already exists
        const existingUser = await models_1.UserModel.findOne({ where: { email } });
        if (existingUser) {
            res.status(409).json({ error: 'User with this email already exists' });
            return;
        }
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        // Create user
        const user = await models_1.UserModel.create({
            email,
            password: hashedPassword,
            firstName,
            lastName,
        });
        // Generate JWT token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET not configured');
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' });
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            },
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
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
        const isValidPassword = await bcrypt.compare(password, user.password);
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
//# sourceMappingURL=authController.js.map