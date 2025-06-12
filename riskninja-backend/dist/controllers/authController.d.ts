import { Request, Response } from 'express';
import { AuthRequest } from '../types';
export declare const register: (req: Request, res: Response) => Promise<void>;
export declare const login: (req: Request, res: Response) => Promise<void>;
export declare const getProfile: (req: Request, res: Response) => Promise<void>;
export declare const registerAdmin: (req: Request, res: Response) => Promise<void>;
/**
 * Change authenticated user's password
 */
export declare const changePassword: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=authController.d.ts.map