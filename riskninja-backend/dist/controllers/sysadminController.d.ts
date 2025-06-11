import { Response } from 'express';
import { AuthRequest } from '../types';
/**
 * Get all companies with their admin users and license usage
 */
export declare const getAllCompanies: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Update license count for a company by delta
 */
export declare const updateCompanyLicenses: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Create or promote an admin user for a given company
 */
export declare const createAdminForCompany: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Create a new company (Global Admin)
 */
export declare const createCompany: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=sysadminController.d.ts.map