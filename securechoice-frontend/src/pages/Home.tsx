import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChatInterface, { ChatMessage, CitationClick } from '../components/ChatInterface';
import ApiStatus from '../components/ApiStatus';
import FileUploader, { UploadedFile } from '../components/FileUploader';
import Dashboard from '../components/Dashboard';
import OnboardingTour from '../components/OnboardingTour';
import { useDocuments, PolicyDocument } from '../contexts/DocumentContext';
import { useAuth } from '../contexts/AuthContext';
import { aiService } from '../services/aiService';
// Policy-specific prompts are now imported dynamically in functions
import { defaultPolicyPrompts } from '../prompts/policyPrompts';
import { chatContextService, ChatContext } from '../services/chatContextService';
import PdfViewer, { CitationHighlight } from '../components/PdfViewer';
import FeatureCard from '../components/FeatureCard';
import PdfDocumentViewer from '../components/PdfDocumentViewer';

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

// Comparison Report interface
interface ComparisonReport {
  id: string;
  title: string;
  content: string;
  documentNames: string[];
  documentIds: string[];
  primaryPolicyType: string;
  additionalFacts?: string;
  createdAt: Date;
  createdBy: string;
}

interface UnderwritingReport {
  id: string;
  userId: string;
  customerId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  
  // Customer/Prospect/Reports state
  const [selectedView, setSelectedView] = useState<'customers' | 'prospects' | 'reports'>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [prospects, setProspects] = useState<Customer[]>([]);
  const [comparisonReports, setComparisonReports] = useState<ComparisonReport[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedReport, setSelectedReport] = useState<ComparisonReport | null>(null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerType, setNewCustomerType] = useState<'customer' | 'prospect'>('customer');
  
  // Customer detail view states
  const [customerDetailView, setCustomerDetailView] = useState<'chats' | 'documents' | 'reports'>('chats');
  const [showContactOverlay, setShowContactOverlay] = useState(false);
  const [chatHistoryPage, setChatHistoryPage] = useState(0);
  const CHATS_PER_PAGE = 6;
  
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
  const [customerReports, setCustomerReports] = useState<{[key: string]: UnderwritingReport[]}>({});
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [loadingCustomerData, setLoadingCustomerData] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  
  // Document selection and viewer state
  const [customerSelectedDocumentIds, setCustomerSelectedDocumentIds] = useState<string[]>([]);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<PolicyDocument | null>(null);

  // Report selection and viewer state
  const [customerSelectedReportIds, setCustomerSelectedReportIds] = useState<string[]>([]);
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [viewingReport, setViewingReport] = useState<UnderwritingReport | null>(null);

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

  // Citation click state
  const [clickedCitation, setClickedCitation] = useState<CitationClick | null>(null);
  const [highlight, setHighlight] = useState<CitationHighlight | null>(null);
  const [citationMap, setCitationMap] = useState<Array<{
    docId: string;
    pageNumber: number;
    startOffset: number;
    endOffset: number;
    text: string;
  }>>([]);

  // API functions for customer data and reports
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

  const fetchComparisonReports = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/comparison-reports`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const reports = await response.json();
        setComparisonReports(reports);
      } else {
        console.error('Failed to fetch comparison reports:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching comparison reports:', error);
    }
  }, [token]);

  // Function to save a new comparison report
  const saveComparisonReport = async (reportData: Omit<ComparisonReport, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/comparison-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reportData)
      });
      
      if (response.ok) {
        const newReport = await response.json();
        setComparisonReports(prev => [...prev, newReport]);
        console.log('📊 Comparison report saved successfully:', newReport.title);
        return newReport;
      } else {
        console.error('Failed to save comparison report:', await response.text());
      }
    } catch (error) {
      console.error('Error saving comparison report:', error);
    }
    return null;
  };

  // Load customers and reports on component mount
  useEffect(() => {
    if (token) {
      fetchCustomers();
      fetchComparisonReports();
    }
  }, [token, fetchCustomers, fetchComparisonReports]);

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
    setSelectedReport(null); // Clear any selected report
    // Set current customer in DocumentContext to enable chat session association
    setCurrentCustomer(customer.id);
    // Clear previous documents when switching customers
    setSelectedDocumentIds([]);
    
    // Reset customer detail view states
    setCustomerDetailView('chats');
    setShowContactOverlay(false);
    setChatHistoryPage(0);
    
    // Set default chat title for this customer
    const today = new Date().toLocaleDateString();
    const title = `${customer.name} - ${today}`;
    setChatTitle(title);
    setIsEditingTitle(false);

    // Fetch customer-specific data
    setLoadingCustomerData(true);
    try {
      const [documents, chats, reports] = await Promise.all([
        fetchCustomerDocuments(customer.id),
        fetchCustomerChats(customer.id),
        fetchCustomerReports(customer.id)
      ]);
      console.log('👤 Customer data loaded - Documents:', documents.length, 'Chats:', chats.length, 'Reports:', reports.length);
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoadingCustomerData(false);
    }
  };

  const handleSelectReport = async (report: ComparisonReport) => {
    console.log('📊 Opening comparison report:', report.title, report.id);
    console.log('📊 Full report object:', JSON.stringify(report, null, 2));
    
    const reportDataPayload = {
      report: report.content,
      reportTitle: report.title,
      documentIds: report.documentIds,
      documentNames: report.documentNames,
      primaryPolicyType: report.primaryPolicyType,
      additionalFacts: report.additionalFacts,
      isExistingReport: true
    };
    
    console.log('📊 Report data payload:', JSON.stringify(reportDataPayload, null, 2));
    
    // Store report data in sessionStorage as backup
    sessionStorage.setItem('comparison-report-data', JSON.stringify(reportDataPayload));
    console.log('💾 Stored in sessionStorage');
    
    // Navigate to comparison page with both state and URL param
    console.log('🚀 Navigating to /comparison');
    navigate(`/comparison?reportId=${report.id}`, {
      state: {
        reportData: reportDataPayload
      }
    });
    console.log('✅ Navigation called');
  };

  const handleSelectReportForChat = async (report: ComparisonReport) => {
    console.log('💬 Selecting comparison report for chat:', report.title, report.id);
    setSelectedReport(report);
    setSelectedCustomer(null); // Clear any selected customer
    setCurrentCustomer(null);
    
    // Set documents from the report
    setSelectedDocumentIds(report.documentIds);
    
    // Set chat title and initialize with report context
    setChatTitle(report.title);
    setIsEditingTitle(false);
    
    // Initialize chat with report context
    const initialMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      content: `I've loaded the comparison report "${report.title}". This report analyzes ${report.documentNames.join(', ')}. Feel free to ask me any questions about the findings or the original documents!`,
      sender: 'ai',
      timestamp: new Date()
    };
    
    setChatHistory([initialMessage]);
    startNewSession();
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

  const getCurrentList = (): (Customer | ComparisonReport)[] => {
    return selectedView === 'customers' ? customers : selectedView === 'prospects' ? prospects : comparisonReports;
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

  // Handle chat messages when a comparison report is selected
  const handleReportChatMessage = async (message: string) => {
    if (!selectedReport) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      content: message,
      sender: 'user',
      timestamp: new Date()
    };
    
    setChatHistory(prev => [...prev, userMessage]);

    // Get selected documents for context
    const reportDocuments = documents.filter(doc => selectedReport.documentIds.includes(doc.id));
    
    // Create comprehensive context with both the report AND the original documents
    const documentTexts = reportDocuments.map((doc, index) =>
      `DOCUMENT ${index + 1}: ${doc.name} (Policy Type: ${doc.policyType || 'Unknown'})
${doc.extractedText || 'Unable to extract text from this document.'}`
    ).join('\n\n---\n\n');

    const contextualPrompt = `
Based on the following comparison report, original documents, and user question, provide a helpful response:

COMPARISON REPORT: "${selectedReport.title}"
${selectedReport.content}

ORIGINAL DOCUMENTS:
${documentTexts}

USER QUESTION: ${message}

Please provide a detailed and helpful response based on both the comparison report and the original document content. You can reference specific details from either the report or the original documents as needed.
`;

    // Create AI message with streaming
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
      let finalAiContent = '';
      await aiService.sendRawPrompt(contextualPrompt, (streamContent) => {
        finalAiContent = streamContent;
        setChatHistory(prev =>
          prev.map(msg =>
            msg.id === aiMessageId ? { ...msg, content: streamContent } : msg
          )
        );
      });

      // Mark streaming as complete
      const finalAiMessage: ChatMessage = {
        id: aiMessageId,
        content: finalAiContent,
        sender: 'ai',
        timestamp: new Date(),
        isStreaming: false
      };

      setChatHistory(prev => 
        prev.map(msg => 
          msg.id === aiMessageId 
            ? finalAiMessage
            : msg
        )
      );

    } catch (error) {
      console.error('Report chat error:', error);
      const errorMessage: ChatMessage = {
        id: aiMessageId,
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
        isStreaming: false
      };

      setChatHistory(prev => 
        prev.map(msg => 
          msg.id === aiMessageId 
            ? errorMessage
            : msg
        )
      );
    }
  };

  const handleSendMessage = async (message: string) => {
    // If a comparison report is selected, use report-specific context
    if (selectedReport) {
      return handleReportChatMessage(message);
    }
    
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
      // Build raw prompt with document spans and conversation history
      const contextData = chatContextService.buildFullContext(currentContext);
      // Fetch spans for each document
      const spanBlocks = await Promise.all(
        contextData.documents.map(async doc => {
          const res = await fetch(`${API_BASE_URL}/documents/${doc.id}/spans`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const spans = res.ok ? await res.json() : [];
          return spans
            .map((span: any) =>
              `[CITATION:${doc.id},${span.pageNumber},${span.startOffset},${span.endOffset}]\n${span.text}`
            )
            .join('\n');
        })
      );
      const docContext = spanBlocks.join('\n\n');
      // Build conversation history text
      const convHistory = contextData.conversationHistory
        .map(h => `${h.sender.toUpperCase()}: ${h.content}`)
        .join('\n');
      // Build raw prompt without citation instructions
      const rawPrompt = `${docContext}\n\n${convHistory}\nUSER: ${message}`;
      // Stream the AI response using raw prompt
      let finalAiContent = '';
      await aiService.sendRawPrompt(rawPrompt, streamContent => {
          finalAiContent = streamContent;
          setChatHistory(prev =>
            prev.map(msg =>
              msg.id === aiMessageId ? { ...msg, content: streamContent } : msg
            )
          );
      });

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

  // Handler for Risk Assessment using policy-specific prompts
  const handleRiskAssessment = async () => {
    console.log('⚙️ handleRiskAssessment invoked. Selected Documents:', selectedDocuments);
    if (!selectedCustomer || selectedDocuments.length === 0) return;
    setIsLoading(true);
    
    // Build citation map from all selected documents
    const allSpans: Array<{
      docId: string;
      pageNumber: number;
      startOffset: number;
      endOffset: number;
      text: string;
    }> = [];
    
    for (const doc of selectedDocuments) {
      console.log('⚙️ Preparing analysis for document:', doc.name, 'policyType:', doc.policyType, 'extractedText length:', doc.extractedText?.length);
      
      // Import the prompt mapping utilities
      const { getAnalysisPrompt } = await import('../utils/promptMapping');
      
      // Get the appropriate prompt based on the document's policy type
      const policyType = doc.policyType || 'general-liability';
      const promptFunction = getAnalysisPrompt(policyType);
      const systemPrompt = promptFunction([doc.name]);
      
      // Fetch spans for citation support
      const res = await fetch(`${API_BASE_URL}/documents/${doc.id}/spans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const spans = res.ok ? await res.json() : [];
      
      // Add spans to citation map
      for (const span of spans) {
        allSpans.push({
          docId: doc.id,
          pageNumber: span.pageNumber,
          startOffset: span.startOffset,
          endOffset: span.endOffset,
          text: span.text
        });
      }
      
      const spanBlocks = spans
        .map((span: any) =>
          `[CITATION:${doc.id},${span.pageNumber},${span.startOffset},${span.endOffset}]\n${span.text}`
        )
        .join('\n');
      
      const documentText = spanBlocks || `Document: ${doc.name}\n${doc.extractedText || 'Unable to extract text from this document.'}`;
      const fullPrompt = `${systemPrompt}\n\n${documentText}`;
      console.log('⚙️ Document ID:', doc.id, 'Document Name:', doc.name);
      console.log('⚙️ First few spans:', spans.slice(0, 3));
      console.log('⚙️ First 500 chars of spanBlocks:', spanBlocks.substring(0, 500));
      // Notify user of analysis action with title
      const titleMsg: ChatMessage = {
        id: generateMessageId(),
        content: `Document Analysis: ${doc.name}`,
        sender: 'user',
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, titleMsg]);
      // Don't save this system-generated message to the backend chat session
      
      // Set citation map before streaming response
      setCitationMap(allSpans);
      
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

  // Handler for Compare & Optimize that uses policy-specific comparison prompts
  const handleComparePolicies = async () => {
    if (!selectedCustomer || selectedDocuments.length < 2) return;
    setIsLoading(true);
    
    // Import the prompt mapping utilities
    const { getComparisonPrompt, determinePrimaryPolicyType } = await import('../utils/promptMapping');
    
    // Determine the primary policy type from selected documents
    const primaryPolicyType = determinePrimaryPolicyType(selectedDocuments);
    console.log('🔍 Primary policy type for comparison:', primaryPolicyType, 'from documents:', selectedDocuments.map(d => ({ name: d.name, policyType: d.policyType })));
    
    // Build document text context with spans for citations
    const documentTexts = await Promise.all(
      selectedDocuments.map(async (doc) => {
        const res = await fetch(`${API_BASE_URL}/documents/${doc.id}/spans`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const spans = res.ok ? await res.json() : [];
        const spanBlocks = spans
          .map((span: any) =>
            `[CITATION:${doc.id},${span.pageNumber},${span.startOffset},${span.endOffset}]\n${span.text}`
          )
          .join('\n');
        
        return spanBlocks || `Document: ${doc.name} (Policy Type: ${doc.policyType || 'Unknown'})\n${doc.extractedText || 'Unable to extract text from this document.'}`;
      })
    );
    
    // Get the appropriate comparison prompt based on the primary policy type
    const comparisonPromptFunction = getComparisonPrompt(primaryPolicyType);
    const systemPrompt = comparisonPromptFunction(selectedDocuments.map(d => d.name));
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

  const fetchCustomerReports = async (customerId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${customerId}/underwriting-reports`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const reports = await response.json();
        setCustomerReports(prev => ({ ...prev, [customerId]: reports }));
        return reports;
      }
    } catch (error) {
      console.error('Error fetching customer reports:', error);
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

  const getCustomerReports = (customerId: string) => {
    return customerReports[customerId] || [];
  };

  // Pagination helpers for chat history tiles
  const getPaginatedChats = (customerId: string) => {
    const chats = getCustomerChats(customerId);
    const startIndex = chatHistoryPage * CHATS_PER_PAGE;
    const endIndex = startIndex + CHATS_PER_PAGE;
    return chats.slice(startIndex, endIndex);
  };

  const getTotalChatPages = (customerId: string) => {
    const chats = getCustomerChats(customerId);
    return Math.ceil(chats.length / CHATS_PER_PAGE);
  };

  const handleNextChatPage = () => {
    if (selectedCustomer) {
      const totalPages = getTotalChatPages(selectedCustomer.id);
      if (chatHistoryPage < totalPages - 1) {
        setChatHistoryPage(prev => prev + 1);
      }
    }
  };

  const handlePrevChatPage = () => {
    if (chatHistoryPage > 0) {
      setChatHistoryPage(prev => prev - 1);
    }
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

  // Handle citation clicks: fetch spans to get bbox then highlight
  const handleCitationClick = async (citation: CitationClick) => {
    setClickedCitation(citation);
    try {
      // First, get fresh download URL for the document
      const urlResponse = await fetch(`${API_BASE_URL}/documents/${citation.docId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let documentUrl = '';
      if (urlResponse.ok) {
        const { downloadUrl } = await urlResponse.json();
        documentUrl = downloadUrl;
        
        // Update the document in our local state with the fresh URL
        const updatedDocuments = documents.map(doc => 
          doc.id === citation.docId ? { ...doc, fileUrl: downloadUrl } : doc
        );
        setDocuments(updatedDocuments);
      } else {
        // Fallback to existing URL if refresh fails
        const doc = documents.find(d => d.id === citation.docId);
        documentUrl = doc?.fileUrl || '';
      }
      
      // Then fetch spans for highlighting
      const spansResponse = await fetch(`${API_BASE_URL}/documents/${citation.docId}/spans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (spansResponse.ok) {
        const spans: Array<{ pageNumber: number; bbox: [number, number, number, number]; startOffset: number; endOffset: number }> = await spansResponse.json();
        // Try exact match on start/end; otherwise fallback to first span on the same page
        let match = spans.find(s => s.pageNumber === citation.page && s.startOffset === citation.start && s.endOffset === citation.end);
        if (!match) {
          match = spans.find(s => s.pageNumber === citation.page);
        }
        if (match) {
          setHighlight({ page: citation.page, bbox: match.bbox });
        }
      }
    } catch (err) {
      console.error('Failed to fetch citation data:', err);
    }
  };

  // Document selection handlers
  const handleDocumentCheckboxChange = (documentId: string, checked: boolean) => {
    if (checked) {
      setCustomerSelectedDocumentIds(prev => [...prev, documentId]);
    } else {
      setCustomerSelectedDocumentIds(prev => prev.filter(id => id !== documentId));
    }
  };

  // Report selection handlers
  const handleReportCheckboxChange = (reportId: string, checked: boolean) => {
    if (checked) {
      setCustomerSelectedReportIds(prev => [...prev, reportId]);
    } else {
      setCustomerSelectedReportIds(prev => prev.filter(id => id !== reportId));
    }
  };

  const handleReportClick = (report: UnderwritingReport) => {
    console.log('📄 Opening report viewer for:', report.title, report);
    setViewingReport(report);
    setShowReportViewer(true);
  };

  const handleDocumentClick = async (document: PolicyDocument) => {
    console.log('📄 Opening document viewer for:', document.name, document);
    
    let documentToView = document;
    
    // If the document has an ID but no local file, try to get a fresh download URL
    if (document.id && !document.file) {
      try {
        console.log('📄 Fetching fresh download URL for document:', document.id);
        const response = await fetch(`${API_BASE_URL}/documents/${document.id}/download`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('📄 Got fresh download URL:', data.downloadUrl);
          
          // Test if the URL is accessible
          try {
            const testResponse = await fetch(data.downloadUrl, { method: 'HEAD' });
            if (testResponse.ok) {
              console.log('📄 Download URL is accessible');
              documentToView = { ...document, fileUrl: data.downloadUrl };
                          } else {
              console.warn('📄 Download URL test failed:', testResponse.status);
            }
          } catch (testError) {
            console.warn('📄 Could not test download URL:', testError);
            // Still try to use the URL even if test fails
            documentToView = { ...document, fileUrl: data.downloadUrl };
                          }
        } else {
          console.warn('📄 Failed to get fresh download URL:', response.status, await response.text());
        }
      } catch (error) {
        console.error('📄 Error fetching fresh download URL:', error);
      }
    }
    
    setViewingDocument(documentToView);
    setShowDocumentViewer(true);
  };

  const getSelectedCustomerDocuments = () => {
    if (!selectedCustomer) return [];
    const customerDocs = getCustomerDocuments(selectedCustomer.id);
    return customerDocs.filter(doc => customerSelectedDocumentIds.includes(doc.id));
  };

  const getSelectedCustomerReports = () => {
    if (!selectedCustomer) return [];
    const customerReports = getCustomerReports(selectedCustomer.id);
    return customerReports.filter(report => customerSelectedReportIds.includes(report.id));
  };

  const handleGenerateUnderwritingReport = async () => {
    if (!selectedCustomer) return;
    
    // Get customer documents for context
    const customerDocs = getCustomerDocuments(selectedCustomer.id);
    const selectedDocs = getSelectedCustomerDocuments();
    
    // Use selected documents if any, otherwise use all customer documents
    const docsToUse = selectedDocs.length > 0 ? selectedDocs : customerDocs;
    
    if (docsToUse.length === 0) {
      alert('No documents available for this customer. Please upload documents first.');
      return;
    }

    // Set the selected documents in the global context for the research page
    setSelectedDocumentIds(docsToUse.map(doc => doc.id));
    
    // Store customer context in localStorage for the research page
    const customerContext = {
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      company: selectedCustomer.company || '',
      type: selectedCustomer.type,
      email: selectedCustomer.email || '',
      phone: selectedCustomer.phone || '',
      documents: docsToUse.map(doc => ({ id: doc.id, name: doc.name }))
    };
    
    localStorage.setItem('riskninja-customer-context', JSON.stringify(customerContext));
    
    // Navigate to research page
    window.location.href = '/research';
  };

  // Updated chat handler to use selected documents and reports
  const handleCustomerChatMessage = async (message: string) => {
    if (!selectedCustomer) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      content: message,
      sender: 'user',
      timestamp: new Date()
    };
    
    setChatHistory(prev => [...prev, userMessage]);

    // Get selected documents and reports for context
    const selectedDocs = getSelectedCustomerDocuments();
    const selectedReports = getSelectedCustomerReports();
    
    // Create context with selected documents
    const documentTexts = selectedDocs.map((doc, index) =>
      `DOCUMENT ${index + 1}: ${doc.name} (Policy Type: ${doc.policyType || 'Unknown'})
${doc.extractedText || 'Unable to extract text from this document.'}`
    ).join('\n\n---\n\n');

    // Create context with selected reports
    const reportTexts = selectedReports.map((report, index) =>
      `REPORT ${index + 1}: ${report.title}
${report.content}`
    ).join('\n\n---\n\n');

    // Build comprehensive context
    let contextualPrompt = `Based on the following information for customer "${selectedCustomer.name}" and the user question, provide a helpful response:\n\n`;
    
    if (selectedDocs.length > 0) {
      contextualPrompt += `DOCUMENTS:\n${documentTexts}\n\n`;
    }
    
    if (selectedReports.length > 0) {
      contextualPrompt += `REPORTS:\n${reportTexts}\n\n`;
    }

    if (selectedDocs.length === 0 && selectedReports.length === 0) {
      contextualPrompt = `The user is asking about customer "${selectedCustomer.name}". No documents or reports are currently selected. 

USER QUESTION: ${message}

Please provide a helpful response. You may suggest selecting relevant documents or reports for more detailed analysis.`;
    } else {
      contextualPrompt += `USER QUESTION: ${message}

Please provide a detailed and helpful response based on the selected documents and reports.`;
    }

    // Create AI message with streaming
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
      let finalAiContent = '';
      await aiService.sendRawPrompt(contextualPrompt, (streamContent) => {
        finalAiContent = streamContent;
        setChatHistory(prev =>
          prev.map(msg =>
            msg.id === aiMessageId ? { ...msg, content: streamContent } : msg
          )
        );
      });

      // Mark streaming as complete
      const finalAiMessage: ChatMessage = {
        id: aiMessageId,
        content: finalAiContent,
        sender: 'ai',
        timestamp: new Date(),
        isStreaming: false
      };

      setChatHistory(prev => 
        prev.map(msg => 
          msg.id === aiMessageId 
            ? finalAiMessage
            : msg
        )
      );

    } catch (error) {
      console.error('Customer chat error:', error);
      const errorMessage: ChatMessage = {
        id: aiMessageId,
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
        isStreaming: false
      };

      setChatHistory(prev => 
        prev.map(msg => 
          msg.id === aiMessageId 
            ? errorMessage
            : msg
        )
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary dark:text-dark-text mb-4">
          Welcome to RiskNinja
        </h1>
        <p className="text-lg text-accent dark:text-dark-muted max-w-3xl">
          Your AI-powered insurance risk assessment platform. Upload documents, generate comprehensive reports, 
          and make informed underwriting decisions with advanced analytics.
        </p>
                </div>

      {/* Customer/Prospects/Reports Management Section */}
      <div className="mb-8">
        <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg p-6">
          {!selectedCustomer ? (
            <>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-secondary dark:text-dark-text">
                  Customer & Report Management
                </h2>
                <div className="flex items-center gap-4">
                  {/* View Toggle */}
                  <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setSelectedView('customers')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    selectedView === 'customers'
                          ? 'bg-white dark:bg-gray-700 text-secondary dark:text-dark-text shadow-sm'
                      : 'text-accent dark:text-dark-muted hover:text-secondary dark:hover:text-dark-text'
                  }`}
                >
                  Customers
                </button>
                <button
                  onClick={() => setSelectedView('prospects')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    selectedView === 'prospects'
                          ? 'bg-white dark:bg-gray-700 text-secondary dark:text-dark-text shadow-sm'
                      : 'text-accent dark:text-dark-muted hover:text-secondary dark:hover:text-dark-text'
                  }`}
                >
                  Prospects
                </button>
                <button
                  onClick={() => setSelectedView('reports')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    selectedView === 'reports'
                          ? 'bg-white dark:bg-gray-700 text-secondary dark:text-dark-text shadow-sm'
                      : 'text-accent dark:text-dark-muted hover:text-secondary dark:hover:text-dark-text'
                  }`}
                >
                  Reports
                </button>
              </div>
              
                  {/* Add New Button */}
                <button
                  onClick={() => {
                      setNewCustomerType(selectedView === 'prospects' ? 'prospect' : 'customer');
                      setShowNewCustomerModal(true);
                  }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                  </svg>
                    Add {selectedView === 'customers' ? 'Customer' : selectedView === 'prospects' ? 'Prospect' : 'Report'}
                </button>
              </div>
            </div>

              {/* Content Area */}
              <div className="min-h-[300px]">
              {loadingCustomers ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getCurrentList().map((item) => (
                    <div
                      key={item.id}
                        className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          if ('type' in item) {
                            handleSelectCustomer(item);
                          } else {
                            handleSelectReport(item);
                          }
                        }}
                    >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {'type' in item ? (
                              <div className={`w-3 h-3 rounded-full ${
                                item.type === 'customer' ? 'bg-green-500' : 'bg-blue-500'
                              }`}></div>
                            ) : (
                              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            )}
                            <h3 className="font-medium text-secondary dark:text-dark-text truncate">
                              {'type' in item ? item.name : item.title}
                            </h3>
                          </div>
                          {'type' in item && item.type === 'prospect' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConvertToCustomer(item.id);
                              }}
                              className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              Convert
                            </button>
                          )}
                        </div>
                        
                        {'type' in item ? (
                          <div className="space-y-1 text-sm text-accent dark:text-dark-muted">
                            {item.company && <p>Company: {item.company}</p>}
                            {item.email && <p>Email: {item.email}</p>}
                            <p>Status: {item.status}</p>
                            <p>Created: {new Date(item.createdAt).toLocaleDateString()}</p>
                        </div>
                        ) : (
                          <div className="space-y-1 text-sm text-accent dark:text-dark-muted">
                            <p>Policy: {item.primaryPolicyType}</p>
                            <p>Documents: {item.documentNames.length}</p>
                            <p>Created: {new Date(item.createdAt).toLocaleDateString()}</p>
                      </div>
                        )}
                      </div>
                    ))}
                    
                    {getCurrentList().length === 0 && (
                      <div className="col-span-full text-center py-8 text-accent dark:text-dark-muted">
                        No {selectedView} found. Click "Add {selectedView === 'customers' ? 'Customer' : selectedView === 'prospects' ? 'Prospect' : 'Report'}" to get started.
                        </div>
                      )}
                      </div>
                )}
                    </div>
            </>
              ) : (
            /* Customer Detail View */
            <div>
              {/* Header with Back Button */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="flex items-center gap-2 px-3 py-2 text-accent dark:text-dark-muted hover:text-secondary dark:hover:text-dark-text transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
                    </svg>
                    Back to List
                  </button>
                  <div>
                    <h2 className="text-xl font-semibold text-secondary dark:text-dark-text">
                      {selectedCustomer.name}
                    </h2>
                    <p className="text-sm text-accent dark:text-dark-muted">
                      {selectedCustomer.type === 'customer' ? 'Customer' : 'Prospect'} • {selectedCustomer.company}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedCustomer.type === 'prospect' && (
                  <button
                      onClick={() => handleConvertToCustomer(selectedCustomer.id)}
                      className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                      Convert to Customer
                  </button>
              )}
                  <button
                    onClick={() => setShowUploader(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                    Upload Documents
                  </button>
                  <button
                    onClick={handleGenerateUnderwritingReport}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9,12H15V10.5H9V12M9,16H15V14.5H9V16M9,8H15V6.5H9V8M5,4V20A2,2 0 0,0 7,22H17A2,2 0 0,0 19,20V4A2,2 0 0,0 17,2H7A2,2 0 0,0 5,4M7,4H17V20H7V4Z" />
                    </svg>
                    Generate Report
                  </button>
                  </div>
                </div>

              {/* Toggle Buttons */}
              <div className="flex items-center gap-2 mb-6">
                <button
                  onClick={() => setCustomerDetailView('chats')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    customerDetailView === 'chats'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="inline mr-2">
                    <path d="M12,3C6.5,3 2,6.58 2,11A7.18,7.18 0 0,0 2.64,14.25L1,22L8.75,20.36C9.81,20.75 10.87,21 12,21C17.5,21 22,17.42 22,13C22,8.58 17.5,5 12,5M12,19C11,19 10.03,18.75 9.18,18.5L8.5,18.25L4.5,19.5L5.75,15.5L5.5,14.82C5.25,13.97 5,13 5,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18Z" />
                  </svg>
                  Chat History ({getCustomerChats(selectedCustomer.id).length})
                </button>
                <button
                  onClick={() => setCustomerDetailView('documents')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    customerDetailView === 'documents'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="inline mr-2">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                  Documents ({getCustomerDocuments(selectedCustomer.id).length})
                </button>
                <button
                  onClick={() => setCustomerDetailView('reports')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    customerDetailView === 'reports'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="inline mr-2">
                    <path d="M9,12H15V10.5H9V12M9,16H15V14.5H9V16M9,8H15V6.5H9V8M5,4V20A2,2 0 0,0 7,22H17A2,2 0 0,0 19,20V4A2,2 0 0,0 17,2H7A2,2 0 0,0 5,4M7,4H17V20H7V4Z" />
                  </svg>
                  Reports ({getCustomerReports(selectedCustomer.id).length})
                </button>
                <button
                  onClick={() => setShowContactOverlay(true)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="inline mr-2">
                      <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                    </svg>
                  Contact Info
                </button>
                  </div>

              {/* Content Area */}
              {customerDetailView === 'chats' ? (
                <div>
                  {/* Chat History Tiles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {getPaginatedChats(selectedCustomer.id).map((chat) => (
                      <div
                        key={chat.id}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group"
                        onClick={() => loadChatSession(chat.id)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600 dark:text-blue-400">
                                <path d="M12,3C6.5,3 2,6.58 2,11A7.18,7.18 0 0,0 2.64,14.25L1,22L8.75,20.36C9.81,20.75 10.87,21 12,21C17.5,21 22,17.42 22,13C22,8.58 17.5,5 12,5" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-secondary dark:text-dark-text text-sm leading-tight break-words">
                                {chat.title || 'Untitled Chat'}
                              </h4>
                            </div>
                          </div>
                      <button
                            onClick={(e) => handleDeleteChatSession(chat.id, e)}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 transition-opacity flex-shrink-0 ml-2"
                      >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                        </svg>
                      </button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-accent dark:text-dark-muted">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
                            </svg>
                            {new Date(chat.lastActivity).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-accent dark:text-dark-muted">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22V22H9Z" />
                            </svg>
                            {chat.messageCount} messages
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {getTotalChatPages(selectedCustomer.id) > 1 && (
                    <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={handlePrevChatPage}
                        disabled={chatHistoryPage === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
                        </svg>
                        Previous
                      </button>
                      <span className="text-sm text-accent dark:text-dark-muted">
                        Page {chatHistoryPage + 1} of {getTotalChatPages(selectedCustomer.id)}
                      </span>
                      <button
                        onClick={handleNextChatPage}
                        disabled={chatHistoryPage >= getTotalChatPages(selectedCustomer.id) - 1}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Next
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z" />
                        </svg>
                    </button>
                  </div>
                  )}

                  {/* Empty State */}
                  {getCustomerChats(selectedCustomer.id).length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
                          <path d="M12,3C6.5,3 2,6.58 2,11A7.18,7.18 0 0,0 2.64,14.25L1,22L8.75,20.36C9.81,20.75 10.87,21 12,21C17.5,21 22,17.42 22,13C22,8.58 17.5,5 12,5" />
                        </svg>
                </div>
                      <h3 className="text-lg font-medium text-secondary dark:text-dark-text mb-2">
                        No chat sessions yet
                      </h3>
                      <p className="text-accent dark:text-dark-muted">
                        Start a conversation with this customer using the chat interface below.
                </p>
              </div>
            )}
                </div>
              ) : customerDetailView === 'documents' ? (
                <div>
                  {/* Documents Tiles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getCustomerDocuments(selectedCustomer.id).map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow group relative"
                      >
                        {/* Checkbox */}
                        <div className="absolute top-3 left-3 z-10">
                          <input
                            type="checkbox"
                            checked={customerSelectedDocumentIds.includes(doc.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleDocumentCheckboxChange(doc.id, e.target.checked);
                            }}
                            className="w-4 h-4 text-primary bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-primary focus:ring-2"
                          />
                        </div>
                        
                        {/* Clickable document area */}
                        <div 
                          className="cursor-pointer"
                          onClick={() => handleDocumentClick(doc)}
                        >
                          <div className="flex items-start justify-between mb-3 pl-6">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-green-600 dark:text-green-400">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-secondary dark:text-dark-text text-sm leading-tight break-words">
                                  {doc.name}
                  </h4>
                            </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDocument(doc.id, doc.name, e);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 transition-opacity flex-shrink-0 ml-2"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                              </svg>
                            </button>
                          </div>
                          <div className="space-y-2 pl-6">
                            <div className="flex items-center gap-2 text-sm text-accent dark:text-dark-muted">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9,10H7V12H9V10M13,10H11V12H13V10M17,10H15V12H17V10M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H6V1H8V3H16V1H18V3H19M19,19V8H5V19H19M7,16H9V14H7V16M13,16H11V14H13V16M17,16H15V14H17V16Z" />
                              </svg>
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-accent dark:text-dark-muted">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z" />
                              </svg>
                              {doc.policyType || 'Unknown Type'}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-accent dark:text-dark-muted">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                              </svg>
                              {(doc.size / (1024 * 1024)).toFixed(2)} MB
                            </div>
                          </div>
                          </div>
                        </div>
                      ))}
                    </div>

                  {/* Empty State */}
                  {getCustomerDocuments(selectedCustomer.id).length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-secondary dark:text-dark-text mb-2">
                        No documents uploaded yet
                      </h3>
                      <p className="text-accent dark:text-dark-muted mb-4">
                        Upload documents for this customer to get started with analysis.
                      </p>
                      <button
                        onClick={() => setShowUploader(true)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Upload Documents
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {/* Reports Tiles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getCustomerReports(selectedCustomer.id).map((report) => (
                      <div
                        key={report.id}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow group relative"
                      >
                        {/* Checkbox */}
                        <div className="absolute top-3 left-3 z-10">
                          <input
                            type="checkbox"
                            checked={customerSelectedReportIds.includes(report.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleReportCheckboxChange(report.id, e.target.checked);
                            }}
                            className="w-4 h-4 text-primary bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-primary focus:ring-2"
                          />
                </div>

                        {/* Clickable report area */}
                        <div 
                          className="cursor-pointer"
                          onClick={() => handleReportClick(report)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-2 flex-1 min-w-0 ml-6">
                              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-purple-600 dark:text-purple-400">
                                  <path d="M9,12H15V10.5H9V12M9,16H15V14.5H9V16M9,8H15V6.5H9V8M5,4V20A2,2 0 0,0 7,22H17A2,2 0 0,0 19,20V4A2,2 0 0,0 17,2H7A2,2 0 0,0 5,4M7,4H17V20H7V4Z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-secondary dark:text-dark-text text-sm leading-tight break-words">
                                  {report.title}
                                </h4>
                            </div>
                              </div>
                              <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Add delete report functionality
                              }}
                              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 transition-opacity flex-shrink-0 ml-2"
                              >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                                </svg>
                              </button>
                            </div>
                          <div className="space-y-2 ml-6">
                            <div className="flex items-center gap-2 text-sm text-accent dark:text-dark-muted">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9,10H7V12H9V10M13,10H11V12H13V10M17,10H15V12H17V10M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H6V1H8V3H16V1H18V3H19M19,19V8H5V19H19M7,16H9V14H7V16M13,16H11V14H13V16M17,16H15V14H17V16Z" />
                              </svg>
                              {new Date(report.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-accent dark:text-dark-muted line-clamp-2">
                              {report.content.substring(0, 100)}...
                            </div>
                          </div>
                          </div>
                        </div>
                      ))}
                    </div>

                  {/* Empty State */}
                  {getCustomerReports(selectedCustomer.id).length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
                          <path d="M9,12H15V10.5H9V12M9,16H15V14.5H9V16M9,8H15V6.5H9V8M5,4V20A2,2 0 0,0 7,22H17A2,2 0 0,0 19,20V4A2,2 0 0,0 17,2H7A2,2 0 0,0 5,4M7,4H17V20H7V4Z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-secondary dark:text-dark-text mb-2">
                        No underwriting reports yet
                      </h3>
                      <p className="text-accent dark:text-dark-muted mb-4">
                        Generate underwriting reports for this customer to get started with risk analysis.
                      </p>
                      <button
                        onClick={handleGenerateUnderwritingReport}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Generate Report
                      </button>
                    </div>
                  )}
                </div>
              )}
              </div>
            )}
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
        {/* Left side - Feature Cards */}
        <div className="space-y-6">
          <FeatureCard 
            icon={
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              </svg>
            }
            title="Document Comparison"
            description="Upload insurance documents and get instant AI-powered comparison with risk assessment and recommendations."
            linkTo="/comparison"
            linkText="Start Analysis"
          />
          
          <FeatureCard 
            icon={
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
              </svg>
            }
            title="Underwriting Research"
            description="Research companies with comprehensive web analysis and document processing for thorough underwriting."
            linkTo="/research"
            linkText="Begin Research"
          />
          
          <FeatureCard 
            icon={
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z" />
              </svg>
            }
            title="Risk Analytics"
            description="View detailed analytics and trends from your processed documents and research reports."
            linkTo="/dashboard"
            linkText="View Analytics"
          />
        </div>

        {/* Right side - Chat Interface or Customer Actions */}
        <div className="flex flex-col min-h-[500px]">
          {selectedCustomer ? (
            <div className="space-y-4">
              {/* Selected Documents Info */}
              {customerSelectedDocumentIds.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    {customerSelectedDocumentIds.length} Document{customerSelectedDocumentIds.length !== 1 ? 's' : ''} Selected
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {getSelectedCustomerDocuments().map(doc => (
                      <span key={doc.id} className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded">
                        {doc.name}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // Navigate to comparison page with customer context
                        const customerContext = {
                          customerId: selectedCustomer.id,
                          customerName: selectedCustomer.name,
                          company: selectedCustomer.company || '',
                          type: selectedCustomer.type,
                          email: selectedCustomer.email || '',
                          phone: selectedCustomer.phone || '',
                          documents: getSelectedCustomerDocuments().map(doc => ({ id: doc.id, name: doc.name }))
                        };
                        
                        localStorage.setItem('riskninja-comparison-customer-context', JSON.stringify(customerContext));
                        setSelectedDocumentIds(customerSelectedDocumentIds);
                        window.location.href = '/comparison';
                      }}
                      className="px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Document Comparison
                    </button>
                    <button
                      onClick={() => {
                        // Navigate to research page with selected documents
                        setSelectedDocumentIds(customerSelectedDocumentIds);
                        window.location.href = '/research';
                      }}
                      className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Risk Assessment
                    </button>
                </div>
                </div>
              )}

              {/* Selected Reports Info */}
              {customerSelectedReportIds.length > 0 && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                    {customerSelectedReportIds.length} Report{customerSelectedReportIds.length !== 1 ? 's' : ''} Selected
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {getSelectedCustomerReports().map(report => (
                      <span key={report.id} className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs rounded">
                        {report.title}
                      </span>
                    ))}
                </div>
                </div>
              )}

              {/* Chat Interface */}
              <ChatInterface 
                onSendMessage={handleCustomerChatMessage}
                messages={chatHistory}
                isLoading={isLoading}
                onCitationClick={handleCitationClick}
                documents={getSelectedCustomerDocuments().map(doc => ({ id: doc.id, name: doc.name }))}
                citationMap={citationMap}
                onClearChat={handleClearChat}
                  />
                </div>
          ) : (
            <ChatInterface 
              onSendMessage={handleSendMessage}
              messages={chatHistory}
              isLoading={isLoading}
              onCitationClick={handleCitationClick}
              documents={documents.map(doc => ({ id: doc.id, name: doc.name }))}
              citationMap={citationMap}
              onClearChat={handleClearChat}
            />
          )}
        </div>
                </div>

      {/* Contact Information Overlay */}
      {showContactOverlay && selectedCustomer && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowContactOverlay(false)}
        >
          <div 
            className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-secondary dark:text-dark-text flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                  <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                </svg>
                Contact Information
              </h3>
                  <button
                onClick={() => setShowContactOverlay(false)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-colors"
                  >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </svg>
                  </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <label className="text-sm font-medium text-accent dark:text-dark-muted">Name</label>
                <p className="text-lg font-medium text-secondary dark:text-dark-text">{selectedCustomer.name}</p>
              </div>
              
              {selectedCustomer.company && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <label className="text-sm font-medium text-accent dark:text-dark-muted">Company</label>
                  <p className="text-lg font-medium text-secondary dark:text-dark-text">{selectedCustomer.company}</p>
                </div>
              )}
              
              {selectedCustomer.email && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <label className="text-sm font-medium text-accent dark:text-dark-muted">Email</label>
                  <p className="text-lg font-medium text-secondary dark:text-dark-text">{selectedCustomer.email}</p>
                </div>
              )}
              
              {selectedCustomer.phone && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <label className="text-sm font-medium text-accent dark:text-dark-muted">Phone</label>
                  <p className="text-lg font-medium text-secondary dark:text-dark-text">{selectedCustomer.phone}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <label className="text-sm font-medium text-accent dark:text-dark-muted">Status</label>
                  <p className="text-lg font-medium text-secondary dark:text-dark-text capitalize">{selectedCustomer.status}</p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <label className="text-sm font-medium text-accent dark:text-dark-muted">Type</label>
                  <p className="text-lg font-medium text-secondary dark:text-dark-text capitalize">{selectedCustomer.type}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <label className="text-sm font-medium text-accent dark:text-dark-muted">Created</label>
                <p className="text-lg font-medium text-secondary dark:text-dark-text">
                  {new Date(selectedCustomer.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              
              {selectedCustomer.lastContact && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <label className="text-sm font-medium text-accent dark:text-dark-muted">Last Contact</label>
                  <p className="text-lg font-medium text-secondary dark:text-dark-text">
                    {new Date(selectedCustomer.lastContact).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
                  <button
                onClick={() => setShowContactOverlay(false)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                Close
                  </button>
                </div>
            </div>
          </div>
        )}

        {/* Document Upload Modal */}
      {showUploader && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#0e161b] dark:text-dark-text">Upload Documents for {selectedCustomer?.name || 'Customer'}</h3>
              <button
                onClick={() => setShowUploader(false)}
                className="text-[#4e7a97] dark:text-dark-muted hover:text-[#0e161b] dark:hover:text-dark-text transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                      </svg>
              </button>
            </div>
            
            <FileUploader onFilesUploaded={handleFilesUploaded} />
                    </div>
                  </div>
                )}

      {/* Document Upload Confirmation Modal */}
      {showDocumentUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-secondary dark:text-dark-text">Document Details</h3>
              <button
                onClick={() => setShowDocumentUploadModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium text-secondary dark:text-dark-text mb-2">Document Name</label>
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-secondary dark:text-dark-text focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Enter document name..."
                  />
                </div>

                <div>
                <label className="block text-sm font-medium text-secondary dark:text-dark-text mb-2">Policy Type</label>
                  <select
                    value={documentPolicyType}
                    onChange={(e) => setDocumentPolicyType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-secondary dark:text-dark-text focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                  {policyTypes.map(type => (
                      <option key={type.value} value={type.value}>
                      {type.label}
                      </option>
                    ))}
                  </select>
              </div>
                </div>

            <div className="flex justify-end gap-3 mt-6">
                  <button
                onClick={() => setShowDocumentUploadModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDocumentUploadConfirm}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Upload Document
                  </button>
              </div>
            </div>
          </div>
        )}

      {/* Document Viewer Overlay */}
      {showDocumentViewer && viewingDocument && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowDocumentViewer(false)}
        >
          <div 
            className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl shadow-xl w-full h-full max-w-6xl max-h-[90vh] mx-4 my-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-green-600 dark:text-green-400">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </div>
                <div>
                  <h3 className="text-lg font-semibold text-secondary dark:text-dark-text">
                    {viewingDocument.name}
              </h3>
                  <p className="text-sm text-accent dark:text-dark-muted">
                    {viewingDocument.policyType || 'Unknown Type'} • {(viewingDocument.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
                <button
                onClick={() => setShowDocumentViewer(false)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </svg>
                  </button>
                </div>
            
            {/* Document Content */}
            <div className="flex-1 p-4 overflow-hidden">
              {(() => {
                // Determine the best way to display the document
                const hasFileUrl = viewingDocument.fileUrl;
                const hasLocalFile = viewingDocument.file;
                const hasExtractedText = viewingDocument.extractedText;
                const isPdf = viewingDocument.type?.includes('pdf') || viewingDocument.name?.toLowerCase().endsWith('.pdf');
                
                console.log('📄 Document viewer state:', {
                  name: viewingDocument.name,
                  type: viewingDocument.type,
                  isPdf,
                  hasFileUrl,
                  hasLocalFile,
                  hasExtractedText,
                  fileUrl: viewingDocument.fileUrl?.substring(0, 100) + '...'
                });

                // Use PDF viewer for PDF files
                if (isPdf && (hasFileUrl || hasLocalFile)) {
                  return (
                    <PdfDocumentViewer
                      document={{
                        id: viewingDocument.id,
                        name: viewingDocument.name,
                        type: viewingDocument.type || 'application/pdf',
                        fileUrl: viewingDocument.fileUrl,
                        file: viewingDocument.file
                      }}
                      onError={(error) => {
                        console.error('📄 PDF viewer error:', error);
                      }}
                    />
                  );
                }

                // Fallback for non-PDF files or when PDF viewer fails
                if (hasFileUrl || hasLocalFile) {
                  const src = hasFileUrl ? viewingDocument.fileUrl : (hasLocalFile && viewingDocument.file ? URL.createObjectURL(viewingDocument.file) : '');
                  return (
                    <div className="w-full h-full">
                      <iframe
                        src={src}
                        className="w-full h-full border border-gray-200 dark:border-gray-700 rounded-lg"
                        title={viewingDocument.name}
                        onLoad={() => {
                          console.log('📄 Iframe loaded successfully');
                        }}
                        onError={() => {
                          console.warn('📄 Iframe failed to load');
                        }}
                      />
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        If the document doesn't load, try the download button below.
            </div>
          </div>
                  );
                }

                // Final fallback - show extracted text and download option
                return (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center max-w-2xl">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-secondary dark:text-dark-text mb-2">
                        Document Preview Unavailable
              </h3>
                      <p className="text-accent dark:text-dark-muted mb-4">
                        This document cannot be previewed in the browser. You can download it or view the extracted content below.
                      </p>
                      
                      {/* Download Button */}
                      {viewingDocument.id && (
              <button
                          onClick={async () => {
                            try {
                              console.log('📄 Attempting to download document:', viewingDocument.id);
                              const response = await fetch(`${API_BASE_URL}/documents/${viewingDocument.id}/download`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                              });
                              if (response.ok) {
                                const data = await response.json();
                                console.log('📄 Opening download URL:', data.downloadUrl);
                                window.open(data.downloadUrl, '_blank');
                              } else {
                                console.error('📄 Download failed:', response.status, await response.text());
                                alert('Failed to download document. Please try again.');
                              }
                            } catch (error) {
                              console.error('📄 Download error:', error);
                              alert('Error downloading document. Please check your connection.');
                            }
                          }}
                          className="mb-6 px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                          📥 Download Document
              </button>
                      )}

                      {/* Extracted Text Content */}
                      {hasExtractedText && (
                        <div className="text-left">
                          <h4 className="text-md font-medium text-secondary dark:text-dark-text mb-3">Document Content:</h4>
                          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm text-secondary dark:text-dark-text max-h-96 overflow-y-auto border">
                            <pre className="whitespace-pre-wrap font-sans">
                              {viewingDocument.extractedText && viewingDocument.extractedText.length > 2000 
                                ? viewingDocument.extractedText.substring(0, 2000) + '\n\n... (content truncated, download full document to see more)'
                                : viewingDocument.extractedText || 'No content available'
                              }
                            </pre>
            </div>
                    </div>
                      )}

                      {/* Debug Info */}
                      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-xs text-left">
                        <strong>Debug Info:</strong><br/>
                        File Type: {viewingDocument.type || 'Unknown'}<br/>
                        Is PDF: {isPdf ? 'Yes' : 'No'}<br/>
                        File URL: {viewingDocument.fileUrl ? 'Available' : 'Not available'}<br/>
                        Local File: {viewingDocument.file ? 'Available' : 'Not available'}<br/>
                        Extracted Text: {hasExtractedText && viewingDocument.extractedText ? `${viewingDocument.extractedText.length} characters` : 'Not available'}<br/>
                        Document ID: {viewingDocument.id || 'Not available'}
                    </div>
                  </div>
                </div>
                );
              })()}
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-dark-border">
              <div className="text-sm text-accent dark:text-dark-muted">
                Uploaded: {new Date(viewingDocument.uploadedAt).toLocaleDateString()}
          </div>
              <div className="flex gap-2">
                {(viewingDocument.fileUrl || viewingDocument.file) && (
                  <a
                    href={viewingDocument.fileUrl || (viewingDocument.file ? URL.createObjectURL(viewingDocument.file) : '#')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-secondary dark:text-dark-text text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Open in New Tab
                  </a>
                )}
                <button
                  onClick={() => setShowDocumentViewer(false)}
                  className="px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
              </div>
            </div>
      )}

      {/* Report Viewer Overlay */}
      {showReportViewer && viewingReport && (
            <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowReportViewer(false)}
        >
          <div 
            className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl shadow-xl w-full h-full max-w-6xl max-h-[90vh] mx-4 my-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-purple-600 dark:text-purple-400">
                    <path d="M9,12H15V10.5H9V12M9,16H15V14.5H9V16M9,8H15V6.5H9V8M5,4V20A2,2 0 0,0 7,22H17A2,2 0 0,0 19,20V4A2,2 0 0,0 17,2H7A2,2 0 0,0 5,4M7,4H17V20H7V4Z" />
                </svg>
              </div>
                <div>
                  <h3 className="text-lg font-semibold text-secondary dark:text-dark-text">
                    {viewingReport.title}
                  </h3>
                  <p className="text-sm text-accent dark:text-dark-muted">
                    Report • Created {new Date(viewingReport.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
                  <button
                onClick={() => setShowReportViewer(false)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-colors"
                  >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                    </svg>
                  </button>
          </div>

            {/* Report Content */}
            <div className="flex-1 p-6 overflow-auto">
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-secondary dark:text-dark-text">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    className="text-sm leading-relaxed"
                    components={{
                      h1: ({children}: {children: React.ReactNode}) => <h1 className="text-secondary dark:text-dark-text">{children}</h1>,
                      h2: ({children}: {children: React.ReactNode}) => <h2 className="text-secondary dark:text-dark-text">{children}</h2>,
                      h3: ({children}: {children: React.ReactNode}) => <h3 className="text-secondary dark:text-dark-text">{children}</h3>,
                      h4: ({children}: {children: React.ReactNode}) => <h4 className="text-secondary dark:text-dark-text">{children}</h4>,
                      h5: ({children}: {children: React.ReactNode}) => <h5 className="text-secondary dark:text-dark-text">{children}</h5>,
                      h6: ({children}: {children: React.ReactNode}) => <h6 className="text-secondary dark:text-dark-text">{children}</h6>,
                      p: ({children}: {children: React.ReactNode}) => <p className="text-secondary dark:text-dark-text">{children}</p>,
                      li: ({children}: {children: React.ReactNode}) => <li className="text-secondary dark:text-dark-text">{children}</li>,
                      strong: ({children}: {children: React.ReactNode}) => <strong className="text-secondary dark:text-dark-text font-bold">{children}</strong>,
                      em: ({children}: {children: React.ReactNode}) => <em className="text-secondary dark:text-dark-text italic">{children}</em>,
                      code: ({children}: {children: React.ReactNode}) => <code className="text-secondary dark:text-dark-text bg-gray-100 dark:bg-gray-800 px-1 rounded">{children}</code>,
                      blockquote: ({children}: {children: React.ReactNode}) => <blockquote className="text-secondary dark:text-dark-text border-l-4 border-gray-300 dark:border-gray-600 pl-4">{children}</blockquote>,
                    }}
                  >
                    {viewingReport.content}
                  </ReactMarkdown>
              </div>
            </div>
            </div>
          
            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-dark-border">
              <div className="text-sm text-accent dark:text-dark-muted">
                Generated: {new Date(viewingReport.createdAt).toLocaleDateString()} • 
                Updated: {new Date(viewingReport.updatedAt).toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                  <button
                  onClick={() => {
                    // Export report as text
                    const content = `${viewingReport.title}\n${'='.repeat(viewingReport.title.length)}\n\nGenerated: ${new Date(viewingReport.createdAt).toLocaleString()}\nCustomer: ${selectedCustomer?.name || 'Unknown'}\n\n${viewingReport.content}`;
                    
                    const blob = new Blob([content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${viewingReport.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-secondary dark:text-dark-text text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                  📥 Export Report
                  </button>
                <button
                  onClick={() => setShowReportViewer(false)}
                  className="px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home; 