import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel, CompanyModel, sequelize } from '../models';
import { LoginRequest, RegisterRequest, AuthRequest } from '../types';

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName } = req.body;

  try {
    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({ where: { email } });
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
    const company = await CompanyModel.findOne({ where: { domain: emailDomain } });
    if (!company) {
      res.status(400).json({ 
        error: 'No company found for your email domain. Please contact your administrator.' 
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await UserModel.create({
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
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user
    const user = await UserModel.findOne({ where: { email } });
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

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '7d' }
    );

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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // User is already available from auth middleware
    res.json({
      user: (req as any).user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin registration: create company and admin user
export const registerAdmin = async (req: Request, res: Response): Promise<void> => {
  const { companyName, domain, email, password, firstName, lastName } = req.body;

  if (!companyName || !domain || !email || !password || !firstName || !lastName) {
    res.status(400).json({ error: 'All fields are required for admin registration.' });
    return;
  }

  const transaction = await sequelize.transaction();

  try {
    // Find or create company by domain
    let company = await CompanyModel.findOne({ where: { domain }, transaction });
    if (!company) {
      company = await CompanyModel.create({ name: companyName, domain }, { transaction });
    }

    // Fetch JWT secret once
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET not configured');

    // Check if a user with this email already exists
    let adminUser = await UserModel.findOne({ where: { email }, transaction });
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
        token: jwt.sign({ userId: adminUser.id, email: adminUser.email }, jwtSecret, { expiresIn: '7d' }),
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
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newAdmin = await UserModel.create({
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
      token: jwt.sign({ userId: newAdmin.id, email: newAdmin.email }, jwtSecret, { expiresIn: '7d' }),
      user: {
        id: newAdmin.id,
        email: newAdmin.email,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        status: newAdmin.status,
        role: newAdmin.role
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Admin registration error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
};

/**
 * Change authenticated user's password
 */
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const user = await UserModel.findByPk(req.user.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Verify current password
    const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidCurrentPassword) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    user.password = hashedNewPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Failed to change password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
}; 