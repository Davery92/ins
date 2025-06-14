import { Response } from 'express';
import { AuthRequest } from '../types';
/**
 * Get all users within the admin's company
 */
export declare const getCompanyUsers: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Activate a user (assign a license)
 */
export declare const activateUser: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Deactivate a user (revoke license)
 */
export declare const deactivateUser: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Create a new user within the admin's company
 */
export declare const createUser: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Change a user's password within the admin's company
 */
export declare const changeUserPassword: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Delete a user within the admin's company
 */
export declare const deleteUser: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=adminController.d.ts.map