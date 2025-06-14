import { Sequelize, Model } from 'sequelize';
export declare const sequelize: Sequelize;
export declare class CompanyModel extends Model {
    id: string;
    name: string;
    domain: string;
    licenseCount: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly users?: UserModel[];
}
export declare class UserModel extends Model {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    status: 'pending' | 'active' | 'disabled';
    role: 'user' | 'admin' | 'system_admin';
    companyId: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly company?: CompanyModel;
}
export declare class ChatMessageModel extends Model {
    id: string;
    userId: string;
    sessionId: string;
    content: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    context: object | null;
}
export declare class PolicyDocumentModel extends Model {
    id: string;
    userId: string;
    customerId: string | null;
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
    fileKey: string | null;
    fileUrl: string | null;
}
export declare class DocumentWordSpanModel extends Model {
    id: string;
    documentId: string;
    pageNumber: number;
    text: string;
    bbox: object;
    startOffset: number;
    endOffset: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export declare class CustomerModel extends Model {
    id: string;
    userId: string;
    name: string;
    type: 'customer' | 'prospect';
    email: string | null;
    phone: string | null;
    company: string | null;
    status: 'active' | 'inactive' | 'lead';
    createdAt: Date;
    lastContact: Date | null;
    readonly updatedAt: Date;
}
export declare class ChatSessionModel extends Model {
    id: string;
    userId: string;
    customerId: string | null;
    title: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class ComparisonReportModel extends Model {
    id: string;
    userId: string;
    customerId: string | null;
    title: string;
    content: string;
    documentNames: string[];
    documentIds: string[];
    primaryPolicyType: string;
    additionalFacts: string | null;
    createdAt: Date;
    readonly updatedAt: Date;
}
export declare class UnderwritingReportModel extends Model {
    id: string;
    userId: string;
    customerId: string;
    title: string;
    content: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export declare const initDatabase: () => Promise<void>;
//# sourceMappingURL=index.d.ts.map