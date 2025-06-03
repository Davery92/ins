import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UploadedFile } from '../components/FileUploader';
import { PolicyOption } from '../components/PolicyComparison';
import { ChatMessage } from '../components/ChatInterface';
import { useAuth } from './AuthContext';

export interface PolicyDocument extends UploadedFile {
  extractedText?: string;
  insights?: string[];
  recommendations?: string[];
  riskScore?: number;
  policyOption?: PolicyOption;
  summary?: string;
  keyTerms?: string[];
}

interface DocumentContextType {
  documents: PolicyDocument[];
  setDocuments: React.Dispatch<React.SetStateAction<PolicyDocument[]>>;
  addDocuments: (newFiles: UploadedFile[]) => void;
  removeDocument: (docId: string) => void;
  updateDocument: (docId: string, updates: Partial<PolicyDocument>) => void;
  getCompletedDocuments: () => PolicyDocument[];
  getPolicyOptions: () => PolicyOption[];
  selectedPolicyType: string;
  setSelectedPolicyType: (type: string) => void;
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  addChatMessage: (message: ChatMessage) => Promise<void>;
  clearChatHistory: () => Promise<void>;
  exportChatHistory: () => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
};

interface DocumentProviderProps {
  children: ReactNode;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const DocumentProvider: React.FC<DocumentProviderProps> = ({ children }) => {
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  const [selectedPolicyType, setSelectedPolicyType] = useState<string>('general-liability');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const { token, user } = useAuth();

  // Load chat history from backend when user logs in
  useEffect(() => {
    if (token && user) {
      loadChatHistory();
    } else {
      setChatHistory([]);
    }
  }, [token, user]);

  const loadChatHistory = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/chat/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChatHistory(data.messages);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const addDocuments = (newFiles: UploadedFile[]) => {
    const newDocs: PolicyDocument[] = newFiles.map(file => ({
      ...file,
      insights: [],
      recommendations: [],
      riskScore: undefined
    }));
    
    setDocuments(prev => [...prev, ...newDocs]);
  };

  const removeDocument = (docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
  };

  const updateDocument = (docId: string, updates: Partial<PolicyDocument>) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === docId ? { ...doc, ...updates } : doc
    ));
  };

  const getCompletedDocuments = () => {
    return documents.filter(doc => doc.status === 'completed');
  };

  const getPolicyOptions = () => {
    return documents
      .filter(doc => doc.policyOption && doc.status === 'completed')
      .map(doc => doc.policyOption!)
      .filter(Boolean);
  };

  const addChatMessage = async (message: ChatMessage): Promise<void> => {
    // Add to local state immediately for UI responsiveness
    setChatHistory(prev => [...prev, message]);

    // Save to backend if user is authenticated
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/chat/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: message.content,
            sender: message.sender,
            context: {
              policyType: selectedPolicyType,
              documentCount: documents.length,
              documentNames: documents.map(doc => doc.name),
            },
          }),
        });
      } catch (error) {
        console.error('Failed to save chat message:', error);
      }
    }
  };

  const clearChatHistory = async (): Promise<void> => {
    setChatHistory([]);

    if (token) {
      try {
        await fetch(`${API_BASE_URL}/chat/history`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Failed to clear chat history on server:', error);
      }
    }
  };

  const exportChatHistory = () => {
    try {
      const content = `RISKNINJA CHAT CONVERSATION EXPORT
Generated: ${new Date().toLocaleString()}
User: ${user?.firstName} ${user?.lastName} (${user?.email})
Policy Type: ${selectedPolicyType}
Documents: ${documents.length} uploaded
Messages: ${chatHistory.length}

${'='.repeat(60)}

${chatHistory.map(msg => {
  const time = new Date(msg.timestamp).toLocaleTimeString();
  const sender = msg.sender.toUpperCase();
  return `[${time}] ${sender}:\n${msg.content}\n`;
}).join('\n')}

${'='.repeat(60)}
Export completed by RiskNinja AI
`;

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `riskninja-chat-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ Chat history exported successfully');
    } catch (error) {
      console.error('❌ Chat export failed:', error);
      alert('Failed to export chat history. Please try again.');
    }
  };

  const value: DocumentContextType = {
    documents,
    setDocuments,
    addDocuments,
    removeDocument,
    updateDocument,
    getCompletedDocuments,
    getPolicyOptions,
    selectedPolicyType,
    setSelectedPolicyType,
    chatHistory,
    setChatHistory,
    addChatMessage,
    clearChatHistory,
    exportChatHistory
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
}; 