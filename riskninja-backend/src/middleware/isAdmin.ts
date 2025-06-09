import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

/**
 * Middleware to ensure the user has an admin role
 */
export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    return;
  }
  next();
}; 