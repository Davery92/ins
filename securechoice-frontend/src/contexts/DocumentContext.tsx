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
  policyType?: string;
  fileUrl?: string;
}

interface DocumentContextType {
  documents: PolicyDocument[];
  createChatSession: (customerId: string | null, title?: string) => Promise<string | null>;
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
  addChatMessage: (message: ChatMessage, title?: string, explicitSessionId?: string) => Promise<string | null>;
  clearChatHistory: () => Promise<void>;
  exportChatHistory: () => void;
  startNewSession: () => void;
  setCurrentCustomer: (customerId: string | null) => void;
  setCurrentChatSession: (sessionId: string | null) => void;
  selectedDocumentIds: string[];
  setSelectedDocumentIds: React.Dispatch<React.SetStateAction<string[]>>;
  toggleDocumentSelection: (docId: string) => void;
  selectedDocuments: PolicyDocument[];
  clearDocuments: () => void;
  currentCustomerId: string | null;
  currentChatSessionId: string | null;
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

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

export function DocumentProvider({ children }: DocumentProviderProps): JSX.Element {
  // Track currently selected customer and chat session purely in React state
  const [currentCustomerId, setCurrentCustomerId] = useState<string | null>(null);
  const [currentChatSessionId, setCurrentChatSessionId] = useState<string | null>(null);
  const { token, user } = useAuth();
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  
  const storageKeySel = `riskninja-selected-documents-${user?.id}`;
  const [selectedPolicyType, setSelectedPolicyType] = useState<string>('general-liability');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>(() => {
    if (user) {
      const stored = localStorage.getItem(storageKeySel);
      if (stored) {
        try { return JSON.parse(stored) as string[]; } catch {} 
      }
    }
    return [];
  });
  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocumentIds(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };
  const selectedDocuments = Array.isArray(documents) ? documents.filter(doc => selectedDocumentIds.includes(doc.id)) : [];
  const clearDocuments = () => {
    setSelectedDocumentIds([]);
  };

  useEffect(() => {
    setChatHistory([]);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/documents`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then((docs: PolicyDocument[] | any) => {
        const docsArray = Array.isArray(docs) ? docs : [];
        setDocuments(docsArray);
        if (user) {
          const stored = localStorage.getItem(storageKeySel);
          if (stored === null) {
            setSelectedDocumentIds(docsArray.map(d => d.id));
          }
        }
      })
      .catch(console.error);
  }, [token, user, storageKeySel]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(storageKeySel, JSON.stringify(selectedDocumentIds));
    }
  }, [selectedDocumentIds, storageKeySel]);

  const addDocuments = async (newFiles: UploadedFile[]) => {
    if (!token) return;
    for (const file of newFiles) {
      let fileName = file.name;
      let skipFile = false;
      while (true) {
        const form = new FormData();
        form.append('file', file.file!);
        form.append('name', fileName);
        try {
          const res = await fetch(`${API_BASE_URL}/documents`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: form
          });
          if (res.ok) {
            const created: PolicyDocument = await res.json();
            setDocuments(prev => [...prev, created]);
            setSelectedDocumentIds(prev => [...prev, created.id]);
            break;
          } else if (res.status === 409) {
            const newName = window.prompt(
              `A document named "${fileName}" already exists. Please enter a new name:`,
              fileName
            )?.trim();
            if (!newName) {
              skipFile = true;
              break;
            }
            fileName = newName;
            continue;
          } else {
            console.error('Failed to upload document:', await res.text());
            break;
          }
        } catch (err) {
          console.error('Upload error:', err);
          break;
        }
      }
      if (skipFile) continue;
    }
  };

  const removeDocument = (docId: string) => {
    if (!token) return;
    fetch(`${API_BASE_URL}/documents/${docId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(() => {
        setDocuments(prev => prev.filter(doc => doc.id !== docId));
        setSelectedDocumentIds(prev => prev.filter(id => id !== docId));
      })
      .catch(console.error);
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

  const createChatSession = async (customerId: string | null, title?: string): Promise<string | null> => {
    if (!token) return null;
    
    try {
      const defaultTitle = customerId ? 'Customer Conversation' : 'New Chat';
      const finalTitle = title || defaultTitle;
      console.log('Creating chat session with title:', finalTitle, 'customerId:', customerId);
      
      const response = await fetch(`${API_BASE_URL}/chat-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: finalTitle,
          customerId: customerId
        }),
      });
      
      if (response.ok) {
        const session = await response.json();
        console.log('Created chat session:', session);
        return session.id;
      } else {
        console.error('Failed to create chat session, response:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to create chat session:', error);
    }
    return null;
  };

  const addChatMessage = async (message: ChatMessage, title?: string, explicitSessionId?: string): Promise<string | null> => {
    console.log('🔄 addChatMessage called with title:', title, 'currentCustomerId:', currentCustomerId, 'currentChatSessionId:', currentChatSessionId);
    setChatHistory(prev => prev.some(msg => msg.id === message.id) ? prev : [...prev, message]);

    let sessionId: string | null = explicitSessionId ?? currentChatSessionId;

    if (token) {
      try {
        // Determine or create a chat session
        console.log('📋 Session ID before:', sessionId);
        if (!sessionId) {
          console.log('🆕 No current session, creating new session with title:', title);
          sessionId = await createChatSession(currentCustomerId, title);
          if (sessionId) {
            setCurrentChatSessionId(sessionId);
            console.log('✅ Created and set new session ID:', sessionId);
          }
        } else {
          console.log('📎 Using provided or existing session ID:', sessionId);
        }

        if (sessionId) {
          console.log('💾 Saving message to session:', sessionId);
          await fetch(`${API_BASE_URL}/chat-sessions/${sessionId}/messages`, {
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
          console.log('✅ Message saved successfully to session:', sessionId);
        } else {
          console.error('❌ No session ID available to save message');
        }
      } catch (error) {
        console.error('❌ Failed to save chat message:', error);
      }
    }
    return sessionId || null;
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

  const setCurrentCustomer = (customerId: string | null) => {
    console.log('🔄 setCurrentCustomer called with:', customerId, 'current:', currentCustomerId);
    // Only clear session if we're switching to a different customer
    if (currentCustomerId !== customerId) {
      console.log('🔄 Switching customer, clearing session');
      setCurrentCustomerId(customerId);
      // Clear current chat session when switching customers
      setCurrentChatSessionId(null);
      setChatHistory([]);
    } else {
      console.log('📋 Same customer, keeping current session');
    }
  };

  const setCurrentChatSession = (sessionId: string | null) => {
    console.log('🔄 setCurrentChatSession called with:', sessionId, 'previous:', currentChatSessionId);
    setCurrentChatSessionId(sessionId);
  };

  const startNewSession = () => {
    setChatHistory([]);
    clearDocuments();
    setCurrentChatSessionId(null);
  };

  const value: DocumentContextType = {
    documents,
    createChatSession,
    selectedDocumentIds,
    selectedDocuments,
    selectedPolicyType,
    chatHistory,
    currentCustomerId,
    currentChatSessionId,
    setDocuments,
    setSelectedDocumentIds,
    toggleDocumentSelection,
    addDocuments,
    removeDocument,
    updateDocument,
    setSelectedPolicyType,
    setChatHistory,
    addChatMessage,
    clearChatHistory,
    exportChatHistory,
    getCompletedDocuments,
    getPolicyOptions,
    clearDocuments,
    startNewSession,
    setCurrentCustomer,
    setCurrentChatSession
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
} 