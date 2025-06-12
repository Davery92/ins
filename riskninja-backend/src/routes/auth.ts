import { Router } from 'express';
import { register, login, getProfile, registerAdmin, changePassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { Request, Response } from 'express';
import { UserModel, CompanyModel, sequelize } from '../models';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();

// Auth routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);

/**
 * @route   PATCH /api/auth/change-password
 * @desc    Change user's own password
 * @access  Private
 */
router.patch('/change-password', authenticateToken, changePassword);

/**
 * @route   POST /api/auth/register-admin
 * @desc    Register a new admin user with company creation
 * @access  Public
 */
router.post('/register-admin', async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, companyName, companyDomain, licenseCount = 5 } = req.body;

  try {
    // Validate required fields
    if (!email || !password || !firstName || !lastName || !companyName || !companyDomain) {
      res.status(400).json({ 
        error: 'All fields are required: email, password, firstName, lastName, companyName, companyDomain' 
      });
      return;
    }

    // Check if admin email already exists
    const existingUser = await UserModel.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    // Check if company domain already exists
    const existingCompany = await CompanyModel.findOne({ where: { domain: companyDomain } });
    if (existingCompany) {
      res.status(400).json({ error: 'Company domain already registered' });
      return;
    }

    // Validate admin email matches company domain
    const emailDomain = email.split('@')[1];
    if (emailDomain !== companyDomain) {
      res.status(400).json({ error: 'Admin email must match company domain' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create company and admin user in transaction
    const result = await sequelize.transaction(async (transaction) => {
      // Create company
      const company = await CompanyModel.create({
        name: companyName,
        domain: companyDomain,
        licenseCount: Math.max(1, licenseCount)
      }, { transaction });

      // Create admin user
      const user = await UserModel.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'admin',
        status: 'active', // Admin is immediately active
        companyId: company.id
      }, { transaction });

      return { company, user };
    });

    // Generate JWT token for immediate login
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const token = jwt.sign(
      { userId: result.user.id, email: result.user.email },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Admin account and company created successfully',
      token,
      company: {
        id: result.company.id,
        name: result.company.name,
        domain: result.company.domain,
        licenseCount: result.company.licenseCount
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        status: result.user.status
      }
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ error: 'Failed to create admin account' });
  }
});

export default router; 