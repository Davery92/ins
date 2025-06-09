export interface ChatMessageAttributes {
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
    chatSessionId: string;
}
export declare const ChatMessageModel: any;
//# sourceMappingURL=ChatMessage.d.ts.map