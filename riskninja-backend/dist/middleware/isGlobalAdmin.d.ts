import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
/**
 * Middleware to check if the authenticated user is a global/system admin
 * This checks if the user's email matches the GLOBAL_ADMIN_EMAIL env var
 * OR if they have the system_admin role
 */
export declare const isGlobalAdmin: (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=isGlobalAdmin.d.ts.map