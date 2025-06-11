import { ChatMessage } from '../components/ChatInterface';

export interface PolicyDocument {
  id: string;
  name: string;
  extractedText?: string;
}

export interface ChatContext {
  messages: ChatMessage[];
  documents: PolicyDocument[];
  policyType?: string;
  customerId?: string;
  sessionId?: string;
}

export class ChatContextService {
  private static instance: ChatContextService;

  public static getInstance(): ChatContextService {
    if (!ChatContextService.instance) {
      ChatContextService.instance = new ChatContextService();
    }
    return ChatContextService.instance;
  }

  /**
   * Build comprehensive context for AI including conversation history and documents
   */
  public buildFullContext(context: ChatContext): {
    conversationHistory: Array<{content: string, sender: 'user' | 'ai', timestamp: Date}>;
    documents: Array<{name: string, extractedText?: string}>;
    policyType?: string;
  } {
    const conversationHistory = context.messages.map(msg => ({
      content: msg.content,
      sender: msg.sender,
      timestamp: msg.timestamp
    }));

    const documents = context.documents.map(doc => ({
      name: doc.name,
      extractedText: doc.extractedText
    }));

    return {
      conversationHistory,
      documents,
      policyType: context.policyType
    };
  }

  /**
   * Validate that essential context is available
   */
  public validateContext(context: ChatContext): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for selected customer
    if (!context.customerId) {
      errors.push('No customer selected. Please select a customer or prospect first.');
    }

    // Check for documents when asking complex questions
    if (context.documents.length === 0) {
      warnings.push('No documents selected. Upload and select insurance documents for more detailed analysis.');
    }

    // Check for document content
    const documentsWithoutText = context.documents.filter(doc => !doc.extractedText?.trim());
    if (documentsWithoutText.length > 0) {
      warnings.push(`${documentsWithoutText.length} document(s) have no extracted text: ${documentsWithoutText.map(d => d.name).join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Generate context summary for debugging
   */
  public generateContextSummary(context: ChatContext): string {
    const messageCount = context.messages.length;
    const userMessages = context.messages.filter(m => m.sender === 'user').length;
    const aiMessages = context.messages.filter(m => m.sender === 'ai').length;
    const docCount = context.documents.length;
    const docsWithText = context.documents.filter(d => d.extractedText?.trim()).length;

    return `Context Summary:
- Messages: ${messageCount} total (${userMessages} user, ${aiMessages} AI)
- Documents: ${docCount} selected (${docsWithText} with extracted text)
- Policy Type: ${context.policyType || 'Not specified'}
- Customer: ${context.customerId ? 'Selected' : 'None'}
- Session: ${context.sessionId || 'New session'}`;
  }

  /**
   * Check if context has changed significantly (for caching purposes)
   */
  public hasContextChanged(oldContext: ChatContext, newContext: ChatContext): boolean {
    if (oldContext.messages.length !== newContext.messages.length) return true;
    if (oldContext.documents.length !== newContext.documents.length) return true;
    if (oldContext.policyType !== newContext.policyType) return true;
    if (oldContext.customerId !== newContext.customerId) return true;

    // Check if document IDs have changed
    const oldDocIds = oldContext.documents.map(d => d.id).sort();
    const newDocIds = newContext.documents.map(d => d.id).sort();
    if (JSON.stringify(oldDocIds) !== JSON.stringify(newDocIds)) return true;

    // Check if last message has changed
    const oldLastMessage = oldContext.messages[oldContext.messages.length - 1];
    const newLastMessage = newContext.messages[newContext.messages.length - 1];
    if (oldLastMessage?.id !== newLastMessage?.id) return true;

    return false;
  }

  /**
   * Extract context from chat session data (for loading saved sessions)
   */
  public extractContextFromSession(sessionData: any): Partial<ChatContext> {
    const context: Partial<ChatContext> = {};

    // Extract messages
    if (sessionData.messages && Array.isArray(sessionData.messages)) {
      context.messages = sessionData.messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        timestamp: new Date(msg.timestamp),
        isStreaming: false
      }));
    }

    // Extract document context from message metadata
    const messagesWithContext = sessionData.messages?.filter((msg: any) => 
      msg.context?.documentNames?.length > 0
    );

    if (messagesWithContext && messagesWithContext.length > 0) {
      const lastContextMessage = messagesWithContext[messagesWithContext.length - 1];
      
      // Extract policy type
      if (lastContextMessage.context.policyType) {
        context.policyType = lastContextMessage.context.policyType;
      }

      // Document names are available but we need to match them with actual documents
      // This will be handled by the caller with access to the document store
    }

    // Extract customer ID
    if (sessionData.customer?.id) {
      context.customerId = sessionData.customer.id;
    }

    // Extract session ID
    if (sessionData.id) {
      context.sessionId = sessionData.id;
    }

    return context;
  }
}

export const chatContextService = ChatContextService.getInstance(); 