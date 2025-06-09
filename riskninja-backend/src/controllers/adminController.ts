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

  try {
    const users = await UserModel.findAll({
      where: { companyId: req.user.companyId },
      attributes: ['id', 'email', 'firstName', 'lastName', 'status', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    // Fetch company to get total licenses
    const company = await CompanyModel.findByPk(req.user.companyId);
    const licenseCount = company?.licenseCount ?? 0;
    const used = users.filter(u => u.status === 'active').length;
    const available = licenseCount - used >= 0 ? licenseCount - used : 0;

    res.json({ users, licenseCount, used, available });
  } catch (error) {
    console.error('Failed to get company users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
}; 