import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

/**
 * Middleware to ensure the user has global admin privileges
 */
export const isGlobalAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Use the same global admin email var as the frontend
  const globalAdminEmail = process.env.REACT_APP_GLOBAL_ADMIN_EMAIL?.trim();
  if (!globalAdminEmail) {
    console.error('REACT_APP_GLOBAL_ADMIN_EMAIL environment variable is not configured');
    res.status(500).json({ error: 'Server misconfiguration: REACT_APP_GLOBAL_ADMIN_EMAIL not configured' });
    return;
  }
  if (!req.user || req.user.email !== globalAdminEmail) {
    res.status(403).json({ error: 'Access denied. Global administrator privileges required.' });
    return;
  }
  next();
}; 