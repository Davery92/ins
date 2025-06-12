import { Response } from 'express';
import { UserModel, CompanyModel } from '../models';
import { AuthRequest } from '../types';
import bcrypt from 'bcrypt';

/**
 * Get all users within the admin's company
 */
export const getCompanyUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(400).json({ error: 'Admin must belong to a company' });
      return;
    }

    const users = await UserModel.findAll({
      where: { companyId: req.user.companyId },
      attributes: ['id', 'email', 'firstName', 'lastName', 'status', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    // Get company info for license counts
    const company = await CompanyModel.findByPk(req.user.companyId, {
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
  } catch (error) {
    console.error('Failed to get company users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
};

/**
 * Activate a user (assign a license)
 */
export const activateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;

  try {
    if (!req.user?.companyId) {
      res.status(400).json({ error: 'Admin must belong to a company' });
      return;
    }

    // Find the user and ensure they belong to the same company
    const user = await UserModel.findOne({
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
    const company = await CompanyModel.findByPk(req.user.companyId);
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const activeLicenses = await UserModel.count({
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
  } catch (error) {
    console.error('Failed to activate user:', error);
    res.status(500).json({ error: 'Failed to activate user' });
  }
};

/**
 * Deactivate a user (revoke license)
 */
export const deactivateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;

  try {
    if (!req.user?.companyId) {
      res.status(400).json({ error: 'Admin must belong to a company' });
      return;
    }

    // Find the user and ensure they belong to the same company
    const user = await UserModel.findOne({
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
  } catch (error) {
    console.error('Failed to deactivate user:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
};

/**
 * Create a new user within the admin's company
 */
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const company = await CompanyModel.findByPk(req.user.companyId);
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
    const existingUser = await UserModel.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create the user
    const user = await UserModel.create({
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
  } catch (error) {
    console.error('Failed to create user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

/**
 * Change a user's password within the admin's company
 */
export const changeUserPassword = async (req: AuthRequest, res: Response): Promise<void> => {
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
    const user = await UserModel.findOne({
      where: { id: userId, companyId: req.user.companyId }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found or not in your company' });
      return;
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

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
  } catch (error) {
    console.error('Failed to change user password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

/**
 * Delete a user within the admin's company
 */
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;

  try {
    if (!req.user?.companyId) {
      res.status(400).json({ error: 'Admin must belong to a company' });
      return;
    }

    // Find the user and ensure they belong to the same company
    const user = await UserModel.findOne({
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
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}; 