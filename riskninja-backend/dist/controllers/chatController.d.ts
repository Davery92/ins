import { Response } from 'express';
import { AuthRequest } from '../types';
export declare const getChatHistory: (req: AuthRequest, res: Response) => Promise<void>;
export declare const saveChatMessage: (req: AuthRequest, res: Response) => Promise<void>;
export declare const clearChatHistory: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getChatStats: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=chatController.d.ts.map