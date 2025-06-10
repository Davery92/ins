import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

/**
 * Middleware to check if the authenticated user has admin or system_admin role
 */
export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // This middleware should run after authenticateToken
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'admin' && req.user.role !== 'system_admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}; 