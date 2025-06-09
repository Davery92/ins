import { Response } from 'express';
import { UserModel, CompanyModel } from '../models';
import { AuthRequest } from '../types';

export const assignLicenseToUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;

  try {
    const user = await UserModel.findByPk(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // "Assigning a license" is flipping the status to 'active'
    user.status = 'active';
    await user.save();

    res.json({
      message: 'License assigned successfully. User account is now active.',
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Failed to assign license:', error);
    res.status(500).json({ error: 'Failed to assign license' });
  }
};

/**
 * @desc Get all users belonging to the authenticated admin's company
 */
export const getCompanyUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  // Determine the companyId: use req.user.companyId, or fallback on the user's email domain
  let companyId = req.user.companyId;
  if (!companyId) {
    const parts = req.user.email.split('@');
    if (parts.length !== 2) {
      res.status(400).json({ error: 'Invalid user email format' });
      return;
    }
    const domain = parts[1];
    const companyRecord = await CompanyModel.findOne({ where: { domain } });
    if (!companyRecord) {
      res.status(400).json({ error: 'Company not found for user\'s email domain' });
      return;
    }
    companyId = companyRecord.id;
    // Persist the derived companyId on the user record for future requests
    await UserModel.update({ companyId }, { where: { id: req.user.id } });
  }

  try {
    const users = await UserModel.findAll({
      where: { companyId },
      attributes: ['id', 'email', 'firstName', 'lastName', 'status', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    // Fetch company to get total licenses
    const company = await CompanyModel.findByPk(companyId);
    const licenseCount = company?.licenseCount ?? 0;
    const used = users.filter(u => u.status === 'active').length;
    const available = licenseCount - used >= 0 ? licenseCount - used : 0;

    res.json({ users, licenseCount, used, available });
  } catch (error) {
    console.error('Failed to get company users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
}; 