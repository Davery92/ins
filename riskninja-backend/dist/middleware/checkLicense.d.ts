import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
/**
 * Middleware to check if user has an active license
 */
export declare const checkLicense: (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=checkLicense.d.ts.map