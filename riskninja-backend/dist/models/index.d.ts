import { Sequelize, Model } from 'sequelize';
export declare const sequelize: Sequelize;
export declare class UserModel extends Model {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export declare class ChatMessageModel extends Model {
    id: string;
    userId: string;
    content: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    context: object | null;
}
export declare class PolicyDocumentModel extends Model {
    id: string;
    userId: string;
    name: string;
    originalName: string;
    size: number;
    type: string;
    uploadedAt: Date;
    status: 'uploaded' | 'processing' | 'completed' | 'error';
    extractedText: string | null;
    summary: string | null;
    keyTerms: string[] | null;
    insights: string[] | null;
    recommendations: string[] | null;
    riskScore: number | null;
    policyType: string | null;
}
export declare const initDatabase: () => Promise<void>;
//# sourceMappingURL=index.d.ts.map