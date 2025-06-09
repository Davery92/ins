import { Response } from 'express';
import { AuthRequest } from '../types';
import { CompanyModel, UserModel, sequelize } from '../models';
const bcrypt = require('bcryptjs');

/**
 * Get all companies with their admin users and license usage
 */
export const getAllCompanies = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companies = await CompanyModel.findAll({
      attributes: ['id', 'name', 'domain', 'licenseCount', 'createdAt', 'updatedAt'],
      include: [
        {
          model: UserModel,
          as: 'users',
          where: { role: 'admin' },
          required: false,
          attributes: ['id', 'email', 'firstName', 'lastName', 'status', 'createdAt']
        }
      ]
    });

    // Calculate used and available licenses for each company
    const companyData = await Promise.all(companies.map(async (company) => {
      const data = company.get({ plain: true }) as any;
      const used = await UserModel.count({ where: { companyId: data.id, status: 'active' } });
      const available = data.licenseCount - used >= 0 ? data.licenseCount - used : 0;
      return {
        ...data,
        used,
        available,
        admins: data.users
      };
    }));

    res.json({ companies: companyData });
  } catch (error) {
    console.error('Failed to get companies:', error);
    res.status(500).json({ error: 'Failed to retrieve companies' });
  }
};

/**
 * Update license count for a company by delta
 */
export const updateCompanyLicenses = async (req: AuthRequest, res: Response): Promise<void> => {
  const { companyId } = req.params;
  const { delta } = req.body;

  if (typeof delta !== 'number') {
    res.status(400).json({ error: 'Invalid delta value' });
    return;
  }

  try {
    const company = await CompanyModel.findByPk(companyId);
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    company.licenseCount = Math.max(company.licenseCount + delta, 0);
    await company.save();

    const used = await UserModel.count({ where: { companyId, status: 'active' } });
    const available = company.licenseCount - used >= 0 ? company.licenseCount - used : 0;

    res.json({ id: company.id, licenseCount: company.licenseCount, used, available });
  } catch (error) {
    console.error('Failed to update company licenses:', error);
    res.status(500).json({ error: 'Failed to update licenses' });
  }
};

/**
 * Create or promote an admin user for a given company
 */
export const createAdminForCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  const { companyId } = req.params;
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || !firstName || !lastName) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  const transaction = await sequelize.transaction();
  try {
    const company = await CompanyModel.findByPk(companyId, { transaction });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      await transaction.rollback();
      return;
    }

    let user = await UserModel.findOne({ where: { email }, transaction });
    if (user) {
      // Promote existing user to admin for this company
      user.firstName = firstName;
      user.lastName = lastName;
      user.role = 'admin';
      user.status = 'active';
      user.companyId = company.id;
      await user.save({ transaction });
    } else {
      // Hash password and create new admin user
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      user = await UserModel.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        companyId: company.id,
        role: 'admin',
        status: 'active'
      }, { transaction });
    }

    await transaction.commit();

    res.status(201).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      role: user.role,
      companyId: user.companyId
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Failed to create admin for company:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
};

/**
 * Create a new company (Global Admin)
 */
export const createCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, domain, licenseCount } = req.body;
  if (!name || !domain || typeof licenseCount !== 'number') {
    res.status(400).json({ error: 'All fields (name, domain, licenseCount) are required and licenseCount must be a number' });
    return;
  }
  try {
    const existing = await CompanyModel.findOne({ where: { domain } });
    if (existing) {
      res.status(409).json({ error: 'Company with this domain already exists' });
      return;
    }
    const company = await CompanyModel.create({ name, domain, licenseCount });
    res.status(201).json({
      id: company.id,
      name: company.name,
      domain: company.domain,
      licenseCount: company.licenseCount,
      used: 0,
      available: company.licenseCount,
      admins: []
    });
  } catch (error) {
    console.error('Failed to create company:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
}; 