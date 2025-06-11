import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
/**
 * Middleware to check if the authenticated user has admin or system_admin role
 */
export declare const isAdmin: (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=isAdmin.d.ts.map