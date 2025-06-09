import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

/**
 * Middleware to check if user has an active license
 */
export const checkLicense = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.status !== 'active') {
    res.status(403).json({
      error: 'Access denied. Your account is pending activation by an administrator.',
    });
    return;
  }
  next();
}; 