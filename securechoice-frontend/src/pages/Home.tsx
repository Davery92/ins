import React, { useState, useEffect, useCallback } from 'react';
import ChatInterface, { ChatMessage } from '../components/ChatInterface';
import ApiStatus from '../components/ApiStatus';
import FileUploader, { UploadedFile } from '../components/FileUploader';
import Dashboard from '../components/Dashboard';
import OnboardingTour from '../components/OnboardingTour';
import { useDocuments } from '../contexts/DocumentContext';
import { useAuth } from '../contexts/AuthContext';
import { aiService } from '../services/aiService';
import { documentAnalysisPrompt, comparePoliciesPrompt } from '../prompts';
import { defaultPolicyPrompts } from '../prompts/policyPrompts';
import { chatContextService, ChatContext } from '../services/chatContextService';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

// Customer/Prospect interfaces
interface Customer {
  id: string;
  name: string;
  type: 'customer' | 'prospect';
  email?: string;
  phone?: string;
  company?: string;
  createdAt: Date;
  lastContact?: Date;
  status: 'active' | 'inactive' | 'lead';
}

const Home: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  
  // Customer/Prospect state
  const [selectedView, setSelectedView] = useState<'customers' | 'prospects'>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [prospects, setProspects] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerType, setNewCustomerType] = useState<'customer' | 'prospect'>('customer');
  
  // Document upload popup state
  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentPolicyType, setDocumentPolicyType] = useState('general-liability');
  
  // Chat session state
  const [chatTitle, setChatTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  // Real customer data state
  const [customerDocuments, setCustomerDocuments] = useState<{[key: string]: any[]}>({});
  const [customerChats, setCustomerChats] = useState<{[key: string]: any[]}>({});
  const [loadingCustomerData, setLoadingCustomerData] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const { user, token } = useAuth();
  const {
    documents,
    setDocuments,
    selectedDocumentIds,
    selectedDocuments,
    setSelectedDocumentIds,
    toggleDocumentSelection,
    selectedPolicyType,
    setSelectedPolicyType,
    chatHistory,
    setChatHistory,
    addChatMessage,
    exportChatHistory,
    startNewSession,
    setCurrentCustomer,
    setCurrentChatSession,
    currentChatSessionId
  } = useDocuments();

  // API functions for customer data
  const fetchCustomers = useCallback(async () => {
    try {
      setLoadingCustomers(true);
      const response = await fetch(`${API_BASE_URL}/customers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const allCustomers = await response.json();
        
        // Separate customers and prospects
        const customerList = allCustomers.filter((c: Customer) => c.type === 'customer');
        const prospectList = allCustomers.filter((c: Customer) => c.type === 'prospect');
        
        setCustomers(customerList);
        setProspects(prospectList);
      } else {
        console.error('Failed to fetch customers:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  }, [token]);

  // Load customers on component mount
  useEffect(() => {
    if (token) {
      fetchCustomers();
    }
  }, [token, fetchCustomers]);

  // Check if user is new (no previous activity)
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('riskninja-onboarding-completed');
    const hasDocuments = documents.length > 0;
    const hasChatHistory = chatHistory.length > 0;
    
    if (!hasSeenTour && !hasDocuments && !hasChatHistory) {
      // Show onboarding after a short delay
      setTimeout(() => setShowOnboarding(true), 1000);
    }
  }, [documents.length, chatHistory.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus chat input
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const chatInput = document.querySelector('textarea[placeholder*="message"]') as HTMLTextAreaElement;
        if (chatInput) {
          chatInput.focus();
        }
      }
      
      // F1 to show help/onboarding
      if (event.key === 'F1') {
        event.preventDefault();
        setShowOnboarding(true);
      }
      
      // Ctrl/Cmd + U to show upload
      if ((event.ctrlKey || event.metaKey) && event.key === 'u') {
        event.preventDefault();
        setShowUploader(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent AI features for non-licensed users
  if (user?.status !== 'active') {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-lg font-bold text-secondary dark:text-dark-text mb-2">
            License Required
          </h2>
          <p className="text-accent dark:text-dark-muted">
            Your account is pending activation by an administrator. AI features are disabled.
          </p>
        </div>
      </div>
    );
  }

  const handleOnboardingComplete = () => {
    localStorage.setItem('riskninja-onboarding-completed', 'true');
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('riskninja-onboarding-completed', 'true');
    setShowOnboarding(false);
  };

  // Customer/Prospect handlers
  const handleCreateCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(customerData)
      });

      if (response.ok) {
        const newCustomer = await response.json();
        
        // Refresh the customer list to include the new customer
        await fetchCustomers();
        
        setShowNewCustomerModal(false);
        
        // Optionally select the newly created customer
        setSelectedCustomer(newCustomer);
        setCurrentCustomer(newCustomer.id);
      } else {
        console.error('Failed to create customer:', await response.text());
      }
    } catch (error) {
      console.error('Error creating customer:', error);
    }
  };

  const handleSelectCustomer = async (customer: Customer) => {
    console.log('👤 Selecting customer:', customer.name, customer.id);
    setSelectedCustomer(customer);
    // Set current customer in DocumentContext to enable chat session association
    setCurrentCustomer(customer.id);
    // Clear previous documents when switching customers
    setSelectedDocumentIds([]);
    
    // Set default chat title for this customer
    const today = new Date().toLocaleDateString();
    const title = `${customer.name} - ${today}`;
    setChatTitle(title);
    setIsEditingTitle(false);

    // Fetch customer-specific data
    setLoadingCustomerData(true);
    try {
      const [documents, chats] = await Promise.all([
        fetchCustomerDocuments(customer.id),
        fetchCustomerChats(customer.id)
      ]);
      console.log('👤 Customer data loaded - Documents:', documents.length, 'Chats:', chats.length);
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoadingCustomerData(false);
    }
  };

  const handleConvertToCustomer = async (prospectId: string) => {
    try {
      const prospect = prospects.find(p => p.id === prospectId);
      if (!prospect) return;

      // Update the prospect to be a customer via API
      const response = await fetch(`${API_BASE_URL}/customers/${prospectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...prospect,
          type: 'customer',
          status: 'active',
          lastContact: new Date().toISOString()
        })
      });

      if (response.ok) {
        const updatedCustomer = await response.json();
        
        // Refresh the customer list
        await fetchCustomers();
        
        // Update selected customer if it was the converted prospect
        if (selectedCustomer?.id === prospectId) {
          setSelectedCustomer(updatedCustomer);
          setCurrentCustomer(updatedCustomer.id);
        }
      } else {
        console.error('Failed to convert prospect:', await response.text());
      }
    } catch (error) {
      console.error('Error converting prospect:', error);
    }
  };

  const getCurrentList = () => {
    return selectedView === 'customers' ? customers : prospects;
  };

  const policyTypes = [
    { value: 'general-liability', label: 'General Liability', description: 'Business liability protection' },
    { value: 'workers-comp', label: 'Workers Comp', description: 'Employee injury protection' },
    { value: 'commercial-auto', label: 'Commercial Auto', description: 'Business vehicle coverage' },
    { value: 'property', label: 'Property', description: 'Property insurance coverage' },
    { value: 'epl', label: 'EPL', description: 'Employment practices liability' },
    { value: 'professional-liability', label: 'Professional Liability', description: 'Errors & omissions coverage' },
    { value: 'cyber-liability', label: 'Cyber Liability', description: 'Data breach and cyber protection' },
    { value: 'environmental-liability', label: 'Environmental Liability', description: 'Environmental risk coverage' },
    { value: 'directors-officers', label: 'Directors & Officers', description: 'Executive liability coverage' }
  ];

  const handleFilesUploaded = async (newFiles: UploadedFile[]) => {
    console.log('📄 Files uploaded:', newFiles.length);
    // Instead of processing immediately, show the popup for title and policy type
    if (newFiles.length > 0 && newFiles[0].file) {
      setPendingFiles([newFiles[0].file]); // For now, handle one file at a time
      setDocumentTitle(newFiles[0].name);
      setDocumentPolicyType('general-liability');
      setShowDocumentUploadModal(true);
      setShowUploader(false);
    }
  };

  const handleDocumentUploadConfirm = async () => {
    if (pendingFiles.length === 0 || !selectedCustomer) return;
    
    const file = pendingFiles[0];

    setShowDocumentUploadModal(false);
    
    // Reset form
    setPendingFiles([]);
    setDocumentTitle('');
    setDocumentPolicyType('general-liability');

    // Upload document to backend with duplicate name handling
    let fileName = documentTitle.trim() || file.name;
    let uploadSuccessful = false;
    
    while (!uploadSuccessful) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', fileName);
        formData.append('policyType', documentPolicyType);
        if (selectedCustomer) {
          formData.append('customerId', selectedCustomer.id);
        }
        
        const res = await fetch(`${API_BASE_URL}/documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
        });
        
        if (res.ok) {
          const data = await res.json();
          console.log('Document uploaded successfully:', data);
          
          // Refresh customer documents if we have a selected customer
          if (selectedCustomer) {
            await fetchCustomerDocuments(selectedCustomer.id);
          }
          
          // Update global documents state directly (don't call addDocuments as it tries to upload again)
          setDocuments(prev => [...prev, data]);
          setSelectedDocumentIds(prev => [...prev, data.id]);
          uploadSuccessful = true;
          
        } else if (res.status === 409) {
          // Handle duplicate name - prompt user for new name
          const newName = window.prompt(
            `A document named "${fileName}" already exists. Please enter a new name:`,
            fileName
          )?.trim();
          
          if (!newName) {
            // User cancelled - abort upload
            alert('Document upload cancelled.');
            return;
          }
          
          fileName = newName;
          // Continue the loop with the new name
          
        } else {
          console.error('Failed to upload document:', await res.text());
          alert('Failed to upload document. Please try again.');
          return;
        }
      } catch (err) {
        console.error('Error uploading document:', err);
        alert('Error uploading document. Please check your connection and try again.');
        return;
      }
    }
  };

  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleSendMessage = async (message: string) => {
    // Build current context for validation
    const currentContext: ChatContext = {
      messages: chatHistory,
      documents: selectedDocuments.map(doc => ({
        id: doc.id,
        name: doc.name,
        extractedText: doc.extractedText
      })),
      policyType: selectedPolicyType,
      customerId: selectedCustomer?.id,
      sessionId: currentChatSessionId || undefined
    };

    // Validate context and show appropriate warnings/errors
    const validation = chatContextService.validateContext(currentContext);
    
    if (!validation.isValid) {
      // Show error messages to user
      for (const error of validation.errors) {
        const errorMsg: ChatMessage = {
          id: generateMessageId(),
          content: error,
          sender: 'ai',
          timestamp: new Date(),
          isStreaming: false
        };
        setChatHistory(prev => [...prev, errorMsg]);
      }
      return;
    }

    // Show warnings if any (but continue with the request)
    if (validation.warnings.length > 0) {
      console.log('Context warnings:', validation.warnings);
      // Could optionally show warnings to user as well
    }

    // Log context summary for debugging
    console.log('📋 Chat Context Summary:', chatContextService.generateContextSummary(currentContext));
    // Add user message
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      content: message,
      sender: 'user',
      timestamp: new Date()
    };
    
    // Only pass title if we're starting a new conversation (no current session)
    const titleForNewSession = !currentChatSessionId ? (chatTitle.trim() || undefined) : undefined;
    // Create or reuse session and send user message
    const sessionId = await addChatMessage(userMessage, titleForNewSession);
    setIsLoading(true);

    // Create AI message with streaming
    const aiMessageId = generateMessageId();
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      content: '',
      sender: 'ai',
      timestamp: new Date(),
      isStreaming: true
    };
    
    // Add AI message to local state for immediate UI update
    setChatHistory((prev: ChatMessage[]) => [...prev, aiMessage]);

    try {
      // Use the enhanced AI service with full conversation context
      const contextData = chatContextService.buildFullContext(currentContext);

      let finalAiContent = '';
      await aiService.sendMessageWithFullContext(
        message,
        contextData.conversationHistory,
        (streamContent) => {
          finalAiContent = streamContent;
          setChatHistory(prev =>
            prev.map(msg =>
              msg.id === aiMessageId ? { ...msg, content: streamContent } : msg
            )
          );
        },
        contextData.documents,
        contextData.policyType
      );

      // Mark streaming as complete and save final AI message to backend
      const finalAiMessage: ChatMessage = {
        id: aiMessageId,
        content: finalAiContent,
        sender: 'ai',
        timestamp: new Date(),
        isStreaming: false
      };

      setChatHistory((prev: ChatMessage[]) => 
        prev.map(msg => 
          msg.id === aiMessageId 
            ? finalAiMessage
            : msg
        )
      );

      // Save AI message to backend (reuse existing session)
      await addChatMessage(finalAiMessage, undefined, sessionId || undefined);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: aiMessageId,
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
        isStreaming: false
      };

      setChatHistory((prev: ChatMessage[]) => 
        prev.map(msg => 
          msg.id === aiMessageId 
            ? errorMessage
            : msg
        )
      );

      // Save error message to backend
      await addChatMessage(errorMessage, undefined, sessionId || undefined);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for Risk Assessment using documentAnalysisPrompt and sendRawPrompt
  const handleRiskAssessment = async () => {
    console.log('⚙️ handleRiskAssessment invoked. Selected Documents:', selectedDocuments);
    if (!selectedCustomer || selectedDocuments.length === 0) return;
    setIsLoading(true);
    for (const doc of selectedDocuments) {
      console.log('⚙️ Preparing analysis for document:', doc.name, 'extractedText length:', doc.extractedText?.length);
      const systemPrompt = documentAnalysisPrompt(doc.name);
      const documentText = `Document: ${doc.name}\n${doc.extractedText || 'Unable to extract text from this document.'}`;
      const fullPrompt = `${systemPrompt}\n\n${documentText}`;
      console.log('⚙️ Full risk assessment prompt:', fullPrompt);
      // Notify user of analysis action with title
      const titleMsg: ChatMessage = {
        id: generateMessageId(),
        content: `Document Analysis: ${doc.name}`,
        sender: 'user',
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, titleMsg]);
      // Don't save this system-generated message to the backend chat session
      // AI message streaming
      const aiMessageId = generateMessageId();
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        content: '',
        sender: 'ai',
        timestamp: new Date(),
        isStreaming: true
      };
      setChatHistory(prev => [...prev, aiMessage]);
      try {
        let finalContent = '';
        await aiService.sendRawPrompt(fullPrompt, (streamContent) => {
          finalContent = streamContent;
          setChatHistory(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, content: streamContent } : msg));
        });
        const completedMessage: ChatMessage = { ...aiMessage, content: finalContent, isStreaming: false };
        setChatHistory(prev => prev.map(msg => msg.id === aiMessageId ? completedMessage : msg));
        // Save only the AI response to the backend, not the system-generated title message
        await addChatMessage(completedMessage, `Document Analysis: ${doc.name}`);
      } catch (error) {
        console.error('Risk Assessment error:', error);
      }
    }
    setIsLoading(false);
  };

  // Handler for Compare & Optimize that includes document summaries as context
  const handleComparePolicies = async () => {
    if (!selectedCustomer || selectedDocuments.length < 2) return;
    setIsLoading(true);
    // Build document text context from extracted PDF text
    const documentTexts = selectedDocuments.map((doc) =>
      `Document: ${doc.name}\n${doc.extractedText || 'Unable to extract text from this document.'}`
    );
    // Build system prompt from comparePoliciesPrompt
    const systemPrompt = comparePoliciesPrompt(selectedDocuments.map(d => d.name));
    const fullPrompt = `${systemPrompt}\n\n${documentTexts.join('\n\n')}`;
    // Notify user of comparison action with title
    const docNames = selectedDocuments.map(doc => doc.name).join(', ');
    const titleMsg: ChatMessage = {
      id: generateMessageId(),
      content: `Compare Policies: ${docNames}`,
      sender: 'user',
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, titleMsg]);
    // Don't save this system-generated message to the backend chat session

    // Create AI message for streaming
    const aiMessageId = generateMessageId();
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      content: '',
      sender: 'ai',
      timestamp: new Date(),
      isStreaming: true
    };
    setChatHistory(prev => [...prev, aiMessage]);
    try {
      let finalContent = '';
      await aiService.sendRawPrompt(fullPrompt, (streamContent) => {
        finalContent = streamContent;
        setChatHistory((prev: ChatMessage[]) => 
          prev.map(msg => msg.id === aiMessageId ? { ...msg, content: streamContent } : msg)
        );
      });
      // Finalize AI message
      const completedMessage: ChatMessage = { ...aiMessage, content: finalContent, isStreaming: false };
      setChatHistory((prev: ChatMessage[]) => prev.map(msg => msg.id === aiMessageId ? completedMessage : msg));
      // Save only the AI response to the backend, not the system-generated title message
      await addChatMessage(completedMessage, `Compare Policies: ${docNames}`);
    } catch (error) {
      console.error('Compare error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // API functions for customer data
  const fetchCustomerDocuments = async (customerId: string) => {
    try {
      console.log('📄 Fetching documents for customer:', customerId);
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const docs = await response.json();
        console.log('📄 Fetched', docs.length, 'documents for customer:', customerId, docs);
        setCustomerDocuments(prev => ({ ...prev, [customerId]: docs }));
        return docs;
      } else {
        console.error('Failed to fetch customer documents:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error fetching customer documents:', error);
    }
    return [];
  };

  const fetchCustomerChats = async (customerId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}/chats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const chats = await response.json();
        setCustomerChats(prev => ({ ...prev, [customerId]: chats }));
        return chats;
      }
    } catch (error) {
      console.error('Error fetching customer chats:', error);
    }
    return [];
  };

  const loadChatSession = async (sessionId: string) => {
    console.log('Loading chat session:', sessionId);
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/chat-sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Handle both 200 and 304 status codes as successful
      if (response.ok || response.status === 304) {
        let session;
        if (response.status === 304) {
          // If 304, we need to make a fresh request to get the data
          const freshResponse = await fetch(`${API_BASE_URL}/chat-sessions/${sessionId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            }
          });
          session = await freshResponse.json();
        } else {
          session = await response.json();
        }
        console.log('Loaded session:', session);
        
        // If the session has a customer and it's different from current, select it
        if (session.customer && (!selectedCustomer || selectedCustomer.id !== session.customer.id)) {
          setSelectedCustomer(session.customer);
          setCurrentCustomer(session.customer.id);
        }
        
        // Load the chat history with correct ChatMessage format
        const messages = session.messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender,
          timestamp: new Date(msg.timestamp),
          isStreaming: false
        }));
        
        setChatHistory(messages);
        
        // Set the chat title from the loaded session
        setChatTitle(session.title || 'Untitled Chat');
        setIsEditingTitle(false);
        
        // Restore document context from the session if available
        // Check if any messages have document context and restore those documents
        const messagesWithContext = session.messages.filter((msg: any) => msg.context?.documentNames?.length > 0);
        if (messagesWithContext.length > 0) {
          const lastContextMessage = messagesWithContext[messagesWithContext.length - 1];
          if (lastContextMessage.context.documentNames) {
            console.log('Restoring document context for session:', lastContextMessage.context.documentNames);
            // Try to match and select documents that were used in this session
            const availableDocuments = getCustomerDocuments(session.customer?.id || selectedCustomer?.id || '');
            const documentsToSelect = availableDocuments.filter(doc => 
              lastContextMessage.context.documentNames.includes(doc.name)
            );
            if (documentsToSelect.length > 0) {
              setSelectedDocumentIds(documentsToSelect.map(doc => doc.id));
              console.log('Restored document selection:', documentsToSelect.map(doc => doc.name));
            }
            
            // Restore policy type if available
            if (lastContextMessage.context.policyType) {
              setSelectedPolicyType(lastContextMessage.context.policyType);
              console.log('Restored policy type:', lastContextMessage.context.policyType);
            }
          }
        }
        
        // Set the current chat session in DocumentContext LAST to ensure it doesn't get cleared
        setCurrentChatSession(session.id);
        
        return session;
      } else {
        console.error('Failed to load chat session:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading chat session:', error);
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  // Updated customer data functions
  const getCustomerDocuments = (customerId: string) => {
    return customerDocuments[customerId] || [];
  };

  const getCustomerChats = (customerId: string) => {
    return customerChats[customerId] || [];
  };

  const handleClearChat = () => {
    setChatHistory([]);
    startNewSession();
    if (selectedCustomer) {
      const today = new Date().toLocaleDateString();
      setChatTitle(`${selectedCustomer.name} - ${today}`);
    } else {
      setChatTitle('');
    }
    setIsEditingTitle(false);
  };

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
  };

  const handleTitleSave = async () => {
    setIsEditingTitle(false);
    
    // Save the title to the backend if we have a current chat session
    if (currentChatSessionId && chatTitle.trim()) {
      try {
        await fetch(`${API_BASE_URL}/chat-sessions/${currentChatSessionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: chatTitle.trim()
          })
        });
        
        // Refresh the customer chats to reflect the updated title
        if (selectedCustomer) {
          await fetchCustomerChats(selectedCustomer.id);
        }
      } catch (error) {
        console.error('Failed to update chat title:', error);
      }
    }
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditingTitle(false);
    }
  };

  const handleDeleteDocument = async (documentId: string, documentName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any parent click handlers
    
    if (!window.confirm(`Are you sure you want to delete "${documentName}"? This cannot be undone.`)) {
      return;
    }

    try {
      console.log('🗑️ Deleting document:', documentId, documentName);
      
      // First, optimistically update the UI by removing from customer documents
      if (selectedCustomer) {
        setCustomerDocuments(prev => ({
          ...prev,
          [selectedCustomer.id]: prev[selectedCustomer.id]?.filter(doc => doc.id !== documentId) || []
        }));
      }
      
      // Call the backend to delete the document
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Update the global documents state directly (don't call removeDocument as it makes another API call)
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        setSelectedDocumentIds(prev => prev.filter(id => id !== documentId));
        console.log('✅ Document deleted successfully');
      } else {
        // If backend deletion failed, revert the optimistic update
        if (selectedCustomer) {
          await fetchCustomerDocuments(selectedCustomer.id);
        }
        throw new Error(`Backend deletion failed: ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
      
      // Refresh customer documents to restore correct state
      if (selectedCustomer) {
        await fetchCustomerDocuments(selectedCustomer.id);
      }
    }
  };

  const handleDeleteChatSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the click from triggering loadChatSession
    
    if (!window.confirm('Are you sure you want to delete this chat conversation? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/chat-sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Refresh the customer chats
        if (selectedCustomer) {
          await fetchCustomerChats(selectedCustomer.id);
        }
      } else {
        console.error('Failed to delete chat session');
        alert('Failed to delete chat session');
      }
    } catch (error) {
      console.error('Error deleting chat session:', error);
      alert('Error deleting chat session');
    }
  };

  return (
    <div className="px-40 flex flex-1 justify-center py-5 dark:bg-dark-bg transition-colors duration-200">
      <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
        <div className="flex flex-wrap justify-between gap-3 p-4">
          <div>
            <p className="text-secondary dark:text-dark-text tracking-light text-[32px] font-bold leading-tight min-w-72">
              AI-Powered Commercial Insurance Analysis
            </p>
            <p className="text-accent dark:text-dark-muted text-lg mt-2">
              Upload your business insurance documents and let RiskNinja optimize your commercial coverage
            </p>
          </div>
        </div>

        {/* Documents Selection Modal */}
        {showDocumentsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-dark-surface text-black dark:text-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4">Select Documents</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {documents.map(doc => (
                  <label key={doc.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedDocumentIds.includes(doc.id)}
                      onChange={() => toggleDocumentSelection(doc.id)}
                      className="form-checkbox h-4 w-4"
                    />
                    <span className="truncate">{doc.name}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={() => { setSelectedDocumentIds([]); setShowDocumentsModal(false); }}
                  className="px-4 py-2 bg-red-500 text-white rounded"
                >
                  Clear All
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowDocumentsModal(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowDocumentsModal(false)}
                    className="px-4 py-2 bg-primary text-white rounded"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customer/Prospect Selector */}
        <div className="px-4 py-4" data-tour="customer-selector">
          <div className="bg-white dark:bg-dark-surface border border-[#d0dee7] dark:border-dark-border rounded-lg p-6">
            {/* Header Tabs */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex border-b border-[#d0dee7] dark:border-dark-border">
                <button
                  onClick={() => setSelectedView('customers')}
                  className={`px-6 py-3 font-medium transition-all ${
                    selectedView === 'customers'
                      ? 'text-primary border-b-2 border-primary bg-blue-50 dark:bg-blue-900/20'
                      : 'text-accent dark:text-dark-muted hover:text-secondary dark:hover:text-dark-text'
                  }`}
                >
                  Customers
                </button>
                <button
                  onClick={() => setSelectedView('prospects')}
                  className={`px-6 py-3 font-medium transition-all ${
                    selectedView === 'prospects'
                      ? 'text-primary border-b-2 border-primary bg-blue-50 dark:bg-blue-900/20'
                      : 'text-accent dark:text-dark-muted hover:text-secondary dark:hover:text-dark-text'
                  }`}
                >
                  Prospects
                </button>
              </div>
              
              {/* New Button with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowNewCustomerModal(true)}
                  className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                  </svg>
                  New
                </button>
              </div>
            </div>

            {/* Current List Display */}
            <div className="mb-4">
              <h3 className="text-lg font-bold text-secondary dark:text-dark-text mb-3">
                {selectedView === 'customers' ? 'Your Customers' : 'Your Prospects'}
              </h3>
              <p className="text-accent dark:text-dark-muted text-sm mb-4">
                Select a {selectedView === 'customers' ? 'customer' : 'prospect'} to manage their insurance documents and policies
              </p>
            </div>

            {/* Customer/Prospect Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {loadingCustomers ? (
                // Loading skeleton
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"></div>
                ))
              ) : getCurrentList().length > 0 ? (
                getCurrentList().map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectCustomer(item)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      selectedCustomer?.id === item.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                        : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className={`font-medium text-sm ${
                          selectedCustomer?.id === item.id 
                            ? 'text-blue-700 dark:text-blue-200' 
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {item.name}
                        </div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        item.status === 'active' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                          : item.status === 'lead'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                      }`}>
                        {item.status}
                      </div>
                    </div>
                    
                    <div className={`text-xs mt-2 ${
                      selectedCustomer?.id === item.id 
                        ? 'text-blue-600 dark:text-blue-300' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {item.company}
                    </div>
                    
                    {item.email && (
                      <div className={`text-xs mt-1 ${
                        selectedCustomer?.id === item.id 
                          ? 'text-blue-500 dark:text-blue-400' 
                          : 'text-gray-500 dark:text-gray-500'
                      }`}>
                        {item.email}
                      </div>
                    )}
                    
                    <div className={`text-xs mt-2 ${
                      selectedCustomer?.id === item.id 
                        ? 'text-blue-500 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-500'
                    }`}>
                      Created: {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                // Empty state
                <div className="col-span-full text-center py-12">
                  <div className="text-gray-400 dark:text-gray-500 mb-4">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="mx-auto">
                      <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No {selectedView} yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Get started by adding your first {selectedView === 'customers' ? 'customer' : 'prospect'}
                  </p>
                  <button
                    onClick={() => {
                      setNewCustomerType(selectedView === 'customers' ? 'customer' : 'prospect');
                      setShowNewCustomerModal(true);
                    }}
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Add {selectedView === 'customers' ? 'Customer' : 'Prospect'}
                  </button>
                </div>
              )}
            </div>
            
            {/* Selected Customer Info */}
            {selectedCustomer && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary dark:text-blue-300">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                    </svg>
                    <span className="text-sm font-medium">
                      Selected: {selectedCustomer.name}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ml-2 ${
                      selectedCustomer.type === 'customer' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {selectedCustomer.type}
                    </span>
                  </div>
                  
                  {/* Convert to Customer Button - only show for prospects */}
                  {selectedCustomer.type === 'prospect' && (
                    <button
                      onClick={() => handleConvertToCustomer(selectedCustomer.id)}
                      className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-full transition-colors flex items-center gap-1"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z" />
                      </svg>
                      Convert to Customer
                    </button>
                  )}
                </div>
                <p className="text-xs text-primary dark:text-blue-300 mt-1">
                  Now managing insurance documents and policies for {selectedCustomer.name}
                </p>
              </div>
            )}

            {/* Customer Documents and Chats */}
            {selectedCustomer && (
              <div className="mt-6 space-y-4">
                {/* Documents Section */}
                <div className="p-4 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-500">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                    Documents ({getCustomerDocuments(selectedCustomer.id).length})
                  </h4>
                  
                  {getCustomerDocuments(selectedCustomer.id).length > 0 ? (
                    <div className="space-y-2">
                      {getCustomerDocuments(selectedCustomer.id).map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
                          <div className="flex items-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-red-500">
                              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                            </svg>
                            <div>
                              <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{doc.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{doc.policyType || doc.type}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-400">
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </div>
                            <button
                              onClick={(e) => handleDeleteDocument(doc.id, doc.name, e)}
                              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all p-1"
                              title="Delete document"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                      {loadingCustomerData ? 'Loading documents...' : 'No documents uploaded yet'}
                    </p>
                  )}
                </div>

                {/* Chat History Section */}
                <div className="p-4 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-green-500">
                      <path d="M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22V22H9Z" />
                    </svg>
                    Chat History ({getCustomerChats(selectedCustomer.id).length})
                  </h4>
                  
                  {getCustomerChats(selectedCustomer.id).length > 0 ? (
                    <div className="space-y-2">
                      {getCustomerChats(selectedCustomer.id).map((chat) => (
                        <div 
                          key={chat.id} 
                          className="p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors group"
                          onClick={() => loadChatSession(chat.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-1">{chat.title}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                                {chat.lastMessage || 'Click to continue this conversation'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <div className="text-xs text-gray-400">
                                {new Date(chat.updatedAt || chat.timestamp).toLocaleDateString()}
                              </div>
                              <button
                                onClick={(e) => handleDeleteChatSession(chat.id, e)}
                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all p-1"
                                title="Delete conversation"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                      {loadingCustomerData ? 'Loading chat history...' : 'No previous conversations'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* New Customer/Prospect Modal */}
        {showNewCustomerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-dark-surface text-black dark:text-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold mb-4">Add New {newCustomerType === 'customer' ? 'Customer' : 'Prospect'}</h3>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const customerData = {
                  name: formData.get('name') as string,
                  type: newCustomerType,
                  email: formData.get('email') as string,
                  phone: formData.get('phone') as string,
                  company: formData.get('company') as string,
                  status: newCustomerType === 'customer' ? 'active' as const : 'lead' as const,
                  lastContact: new Date()
                };
                
                if (customerData.name && customerData.company) {
                  await handleCreateCustomer(customerData);
                }
              }} className="space-y-4">
                
                {/* Type Selector */}
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={newCustomerType}
                    onChange={(e) => setNewCustomerType(e.target.value as 'customer' | 'prospect')}
                    className="w-full border border-[#d0dee7] dark:border-dark-border rounded px-3 py-2 bg-white dark:bg-dark-bg text-secondary dark:text-dark-text"
                  >
                    <option value="customer">Customer</option>
                    <option value="prospect">Prospect</option>
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">Contact Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full border border-[#d0dee7] dark:border-dark-border rounded px-3 py-2 bg-white dark:bg-dark-bg text-secondary dark:text-dark-text"
                    placeholder="John Smith"
                  />
                </div>

                {/* Company */}
                <div>
                  <label className="block text-sm font-medium mb-2">Company Name *</label>
                  <input
                    type="text"
                    name="company"
                    required
                    className="w-full border border-[#d0dee7] dark:border-dark-border rounded px-3 py-2 bg-white dark:bg-dark-bg text-secondary dark:text-dark-text"
                    placeholder="Acme Corporation"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="w-full border border-[#d0dee7] dark:border-dark-border rounded px-3 py-2 bg-white dark:bg-dark-bg text-secondary dark:text-dark-text"
                    placeholder="john@acme.com"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    className="w-full border border-[#d0dee7] dark:border-dark-border rounded px-3 py-2 bg-white dark:bg-dark-bg text-secondary dark:text-dark-text"
                    placeholder="(555) 123-4567"
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-between items-center pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerModal(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-primary text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Add {newCustomerType === 'customer' ? 'Customer' : 'Prospect'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Document Upload Modal */}
        {showDocumentUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-dark-surface text-black dark:text-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold mb-4">Upload Document for {selectedCustomer?.name}</h3>
              
              <div className="space-y-4">
                {/* File Info */}
                {pendingFiles.length > 0 && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-500">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                      </svg>
                      <span className="font-medium">{pendingFiles[0].name}</span>
                      <span className="text-gray-500">({(pendingFiles[0].size / (1024 * 1024)).toFixed(2)} MB)</span>
                    </div>
                  </div>
                )}

                {/* Document Title */}
                <div>
                  <label className="block text-sm font-medium mb-2">Document Title *</label>
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    required
                    className="w-full border border-[#d0dee7] dark:border-dark-border rounded px-3 py-2 bg-white dark:bg-dark-bg text-secondary dark:text-dark-text"
                    placeholder="Enter a descriptive title for this document"
                  />
                </div>

                {/* Policy Type Tag */}
                <div>
                  <label className="block text-sm font-medium mb-2">Policy Type</label>
                  <select
                    value={documentPolicyType}
                    onChange={(e) => setDocumentPolicyType(e.target.value)}
                    className="w-full border border-[#d0dee7] dark:border-dark-border rounded px-3 py-2 bg-white dark:bg-dark-bg text-secondary dark:text-dark-text"
                  >
                    {policyTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Buttons */}
                <div className="flex justify-between items-center pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDocumentUploadModal(false);
                      setPendingFiles([]);
                      setDocumentTitle('');
                      setDocumentPolicyType('general-liability');
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDocumentUploadConfirm}
                    disabled={!documentTitle.trim()}
                    className="px-6 py-2 bg-primary text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Upload Document
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File Upload Section */}
        <div className="px-4 py-6" data-tour="upload-area">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-secondary dark:text-dark-text mb-2">
                {selectedCustomer 
                  ? `Upload Insurance Documents for ${selectedCustomer.name}`
                  : 'Upload Your Commercial Insurance Documents'
                }
              </h3>
              <p className="text-accent dark:text-dark-muted mb-6">
                {selectedCustomer 
                  ? `Drag and drop ${selectedCustomer.name}'s business insurance policy documents here, or click to browse`
                  : 'Select a customer or prospect first, then drag and drop their business insurance policy documents here, or click to browse'
                }
              </p>
              
              {!showUploader ? (
                <button
                  onClick={() => selectedCustomer && setShowUploader(true)}
                  disabled={!selectedCustomer}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedCustomer 
                      ? 'bg-primary hover:bg-blue-600 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {selectedCustomer ? 'Choose Files or Drag & Drop' : 'Select Customer/Prospect First'}
                </button>
              ) : (
                <div className="max-w-2xl mx-auto">
                  <FileUploader onFilesUploaded={handleFilesUploaded} />
                  <button
                    onClick={() => setShowUploader(false)}
                    className="mt-4 text-accent dark:text-dark-muted hover:text-secondary dark:hover:text-dark-text text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Uploaded Documents Status */}
        {selectedDocuments.length > 0 && (
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-secondary dark:text-dark-text">
                Uploaded Documents ({selectedDocuments.length})
              </h3>
              <button
                onClick={() => setSelectedDocumentIds([])}
                className="text-red-500 dark:text-red-400 text-sm font-medium hover:underline"
              >
                Clear Documents
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedDocuments.map((doc) => (
                <div key={doc.id} className="bg-white dark:bg-dark-surface border border-[#d0dee7] dark:border-dark-border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-secondary dark:text-dark-text truncate">
                        {doc.name}
                      </h4>
                      <p className="text-sm text-accent dark:text-dark-muted">
                        Ready for AI analysis via chat
                      </p>
                    </div>
                    <div className="ml-3 text-sm font-medium text-secondary dark:text-dark-text">
                      {(doc.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 cursor-pointer hover:shadow-md transition-all"
              onClick={() => setShowDocumentsModal(true)}
            >
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </div>
              <h3 className="font-semibold text-secondary dark:text-dark-text mb-2">Documents</h3>
              <p className="text-accent dark:text-dark-muted text-sm">
                Select documents for your AI chat context
              </p>
            </div>

            <div 
              className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-lg p-6 cursor-pointer hover:shadow-md transition-all"
              onClick={() => {
                if (selectedCustomer && selectedDocuments.length > 0) {
                  handleRiskAssessment();
                }
              }}
            >
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M9,12L11,14L15,10L13,8L11,10L9,8L7,10M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z" />
                </svg>
              </div>
              <h3 className="font-semibold text-secondary dark:text-dark-text mb-2">Get Risk Assessment</h3>
              <p className="text-accent dark:text-dark-muted text-sm">
                {!selectedCustomer 
                  ? 'Select a customer or prospect first, then upload documents'
                  : selectedDocuments.length > 0 
                  ? `Click to analyze ${selectedCustomer.name}'s policies via AI chat` 
                  : `Upload ${selectedCustomer.name}'s documents first to receive intelligent risk analysis`
                }
              </p>
            </div>

            <div
              className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border border-amber-200 dark:border-amber-700 rounded-lg p-6 cursor-pointer hover:shadow-md transition-all"
              onClick={handleComparePolicies}
            >
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z" />
                </svg>
              </div>
              <h3 className="font-semibold text-secondary dark:text-dark-text mb-2">Compare & Optimize</h3>
              <p className="text-accent dark:text-dark-muted text-sm">
                {!selectedCustomer 
                  ? 'Select a customer or prospect first, then upload multiple policies'
                  : selectedDocuments.length >= 2 
                  ? `Click to get AI-powered comparison and optimization for ${selectedCustomer.name}` 
                  : selectedDocuments.length === 1
                  ? `Upload another policy for ${selectedCustomer.name} to enable AI comparison`
                  : `Upload multiple policies for ${selectedCustomer.name} to enable AI comparison`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Business Intelligence Dashboard */}
        {selectedDocuments.length > 0 && (
          <div className="px-4 py-6" data-tour="dashboard">
            <Dashboard />
          </div>
        )}

        {/* AI Chat Interface */}
        <div className="px-4 py-6 flex flex-col flex-1 min-h-0 overflow-y-auto" data-tour="chat-interface">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-secondary dark:text-dark-text text-[22px] font-bold leading-tight tracking-[-0.015em]">
              Chat with RiskNinja AI
            </h2>
            <div className="flex items-center gap-3">
              <ApiStatus />
              {chatHistory.length > 0 && (
                <>
                  <button
                    onClick={exportChatHistory}
                    className="text-primary hover:text-blue-600 text-sm font-medium flex items-center gap-1 transition-colors"
                    title="Export chat conversation"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
                    </svg>
                    Export
                  </button>
                  <button
                    onClick={handleClearChat}
                    className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1 transition-colors"
                    title="Clear chat history"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                    </svg>
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Chat Title Input */}
          {selectedCustomer && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gray-500">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={chatTitle}
                    onChange={(e) => setChatTitle(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyPress={handleTitleKeyPress}
                    placeholder="Enter chat title..."
                    className="flex-1 text-sm font-medium bg-transparent border-none outline-none text-gray-900 dark:text-gray-100"
                    autoFocus
                  />
                ) : (
                  <span
                    onClick={handleTitleEdit}
                    className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Click to edit title"
                  >
                    {chatTitle || 'Untitled Chat'}
                  </span>
                )}
                <button
                  onClick={handleTitleEdit}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Edit title"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {/* Context-aware suggestions */}
          {selectedDocuments.length > 0 && selectedCustomer && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-medium text-secondary dark:text-dark-text mb-2">
                💡 Try asking about {selectedCustomer.name}'s insurance policies:
              </h4>
              <div className="flex flex-wrap gap-2">
                {defaultPolicyPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isLoading}
                    className="px-3 py-1 text-xs bg-white dark:bg-dark-bg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
                {/* Additional customer-specific prompts */}
                <button
                  onClick={() => handleSendMessage(`What are the insurance needs for a business like ${selectedCustomer.name}?`)}
                  disabled={isLoading}
                  className="px-3 py-1 text-xs bg-white dark:bg-dark-bg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
                >
                  Business-specific coverage needs
                </button>
                <button
                  onClick={() => handleSendMessage(`Generate a coverage summary report for ${selectedCustomer.name}`)}
                  disabled={isLoading}
                  className="px-3 py-1 text-xs bg-white dark:bg-dark-bg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
                >
                  Generate coverage summary
                </button>
              </div>
            </div>
          )}
          
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ChatInterface
              messages={chatHistory}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Onboarding Tour */}
        <OnboardingTour
          isVisible={showOnboarding}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      </div>
    </div>
  );
};

export default Home; 