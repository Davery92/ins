import { Response } from 'express';
import { AuthRequest } from '../types';
/**
 * Get all users across all companies
 */
export declare const getAllUsers: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get all companies
 */
export declare const getAllCompanies: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Create a new company
 */
export declare const createCompany: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Update license count for a company
 */
export declare const updateCompanyLicenses: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=systemAdminController.d.ts.map