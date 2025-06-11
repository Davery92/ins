import { Request } from 'express';
export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface ChatMessage {
    id: string;
    userId: string;
    content: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    context?: {
        policyType?: string;
        documentCount?: number;
        documentNames?: string[];
    };
}
export interface PolicyDocument {
    id: string;
    userId: string;
    name: string;
    originalName: string;
    size: number;
    type: string;
    uploadedAt: Date;
    status: 'uploaded' | 'processing' | 'completed' | 'error';
    extractedText?: string;
    summary?: string;
    keyTerms?: string[];
    insights?: string[];
    recommendations?: string[];
    riskScore?: number;
    policyType?: string;
}
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        status: 'pending' | 'active' | 'disabled';
        role: 'user' | 'admin' | 'system_admin';
        companyId: string;
    };
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}
export interface JWTPayload {
    userId: string;
    email: string;
    iat: number;
    exp: number;
}
//# sourceMappingURL=index.d.ts.map