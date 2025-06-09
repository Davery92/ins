import React, { useState, useEffect, useRef } from 'react';
import ChatInterface, { ChatMessage } from '../components/ChatInterface';
import ApiStatus from '../components/ApiStatus';
import FileUploader, { UploadedFile } from '../components/FileUploader';
import Dashboard from '../components/Dashboard';
import OnboardingTour from '../components/OnboardingTour';
import { useDocuments } from '../contexts/DocumentContext';
import { useAuth } from '../contexts/AuthContext';
import { aiService } from '../services/aiService';
import { documentAnalysisPrompt, comparePoliciesPrompt } from '../prompts';
import { policyPrompts, defaultPolicyPrompts } from '../prompts/policyPrompts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2pdf from 'html2pdf.js';

const API_BASE_URL = process.env.REACT_APP_API_URL || window.location.origin + '/api';

const Home: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [mode, setMode] = useState<'policyChat' | 'research'>('policyChat');
  const [researchUrl, setResearchUrl] = useState('');
  // Research report modal state
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [researchReportContent, setResearchReportContent] = useState<string>('');
  const [researchReportError, setResearchReportError] = useState<string | null>(null);
  const [isGeneratingResearch, setIsGeneratingResearch] = useState(false);
  const researchReportRef = useRef<HTMLDivElement>(null);
  
  const { user, token } = useAuth();
  const { 
    documents,
    selectedDocumentIds,
    selectedDocuments,
    setSelectedDocumentIds,
    toggleDocumentSelection,
    addDocuments,
    updateDocument,
    selectedPolicyType,
    setSelectedPolicyType,
    chatHistory,
    setChatHistory,
    addChatMessage,
    exportChatHistory,
    startNewSession
  } = useDocuments();

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

  const handleOnboardingComplete = () => {
    localStorage.setItem('riskninja-onboarding-completed', 'true');
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('riskninja-onboarding-completed', 'true');
    setShowOnboarding(false);
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
    // Prompt user for custom titles
    const filesWithTitles = newFiles.map(file => ({
      ...file,
      name: (window.prompt(`Enter a title for ${file.name}`, file.name) || file.name).trim()
    }));
    // Add documents locally with custom titles
    addDocuments(filesWithTitles);
    setShowUploader(false);

    // For each new file, extract text via backend and update document
    await Promise.all(filesWithTitles.map(async (file) => {
      if (file.file) {
        try {
          const formData = new FormData();
          formData.append('file', file.file);
          const res = await fetch(`${API_BASE_URL}/documents/extract`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            updateDocument(file.id, { extractedText: data.text });
          } else {
            console.error('Failed to extract PDF:', await res.text());
          }
        } catch (err) {
          console.error('Error extracting PDF:', err);
        }
      }
    }));

    // Update AI service context with document names
    aiService.updatePolicyContext([
      ...documents.map(d => d.name),
      ...filesWithTitles.map(f => f.name)
    ]);

    // Do not automatically trigger analysis on upload
  };

  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleSendMessage = async (message: string) => {
    // If no documents are uploaded, prompt user to upload one
    if (selectedDocuments.length === 0) {
      const warningMsg: ChatMessage = {
        id: generateMessageId(),
        content: 'Please select a document to talk about.',
        sender: 'ai',
        timestamp: new Date(),
        isStreaming: false
      };
      setChatHistory(prev => [...prev, warningMsg]);
      return;
    }
    // Add user message
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      content: message,
      sender: 'user',
      timestamp: new Date()
    };
    
    await addChatMessage(userMessage);
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
      // Build conversation context including all previous messages
      const historyForContext = [...chatHistory, userMessage];
      const conversationString = historyForContext.map(msg =>
        `${msg.sender === 'user' ? 'User' : 'AI'}: ${msg.content}`
      ).join('\n');

      // Include selected documents context
      let promptMessage = conversationString;
      if (selectedDocuments.length > 0) {
        const docContext = `\n\nUser Document Context: I have selected ${selectedDocuments.length} commercial insurance document(s): ${selectedDocuments.map(d => d.name).join(', ')}. Policy type focus: ${policyTypes.find(t => t.value === selectedPolicyType)?.label || 'General Commercial'}.`;
        promptMessage += docContext;
        // Append extracted text of each selected document for AI context
        selectedDocuments.forEach(doc => {
          promptMessage += `\n\nDocument: ${doc.name}\n${doc.extractedText || 'Unable to extract text from this document.'}`;
        });
      }

      // Update AI service with selected document context before sending message
      if (selectedDocuments.length > 0) {
        const documentNames = selectedDocuments.map(d => d.name);
        aiService.updatePolicyContext(documentNames);
      }

      let finalAiContent = '';
      await aiService.sendMessage(promptMessage, (streamContent) => {
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

      // Save AI message to backend
      await addChatMessage(finalAiMessage);
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
      await addChatMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for Risk Assessment using documentAnalysisPrompt and sendRawPrompt
  const handleRiskAssessment = async () => {
    console.log('⚙️ handleRiskAssessment invoked. Selected Documents:', selectedDocuments);
    if (selectedDocuments.length === 0) return;
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
      await addChatMessage(titleMsg);
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
        await addChatMessage(completedMessage);
      } catch (error) {
        console.error('Risk Assessment error:', error);
      }
    }
    setIsLoading(false);
  };

  // Handler for Compare & Optimize that includes document summaries as context
  const handleComparePolicies = async () => {
    if (selectedDocuments.length < 2) return;
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
    await addChatMessage(titleMsg);

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
      await addChatMessage(completedMessage);
    } catch (error) {
      console.error('Compare error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async (): Promise<void> => {
    if (!researchUrl) return;
    setShowResearchModal(true);
    setResearchReportError(null);
    setResearchReportContent('');
    setIsGeneratingResearch(true);
    try {
      const res = await fetch(`${API_BASE_URL}/research/generate?preview=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ url: researchUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setResearchReportContent(data.markdown);
      } else {
        const errText = await res.text();
        console.error('Failed to generate research report', errText);
        setResearchReportError('Failed to generate research report');
      }
    } catch (err) {
      console.error('Error generating research report', err);
      setResearchReportError('Error generating research report');
    } finally {
      setIsGeneratingResearch(false);
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

        {/* Mode Selector */}
        <div className="px-4 py-4">
          <div className="bg-white dark:bg-dark-surface border border-[#d0dee7] dark:border-dark-border rounded-lg p-6 flex items-center gap-4">
            <label htmlFor="mode" className="font-medium text-secondary dark:text-dark-text">
              Mode:
            </label>
            <select
              id="mode"
              value={mode}
              onChange={e => setMode(e.target.value as 'policyChat' | 'research')}
              className="border rounded px-2 py-1 pr-8"
            >
              <option value="policyChat">Policy Chat</option>
              <option value="research">Research</option>
            </select>
          </div>
        </div>

        {mode === 'policyChat' && (
          <div className="px-4 py-4" data-tour="policy-selector">
            <div className="bg-white dark:bg-dark-surface border border-[#d0dee7] dark:border-dark-border rounded-lg p-6">
              <h3 className="text-lg font-bold text-secondary dark:text-dark-text mb-3">
                Select Policy Type
              </h3>
              <p className="text-accent dark:text-dark-muted text-sm mb-4">
                Choose the type of commercial insurance you're analyzing for targeted AI insights
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {policyTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedPolicyType(type.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedPolicyType === type.value
                        ? 'bg-primary border-primary text-white'
                        : 'bg-white dark:bg-dark-bg border-[#d0dee7] dark:border-dark-border text-secondary dark:text-dark-text hover:border-primary hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    <div className="font-medium text-sm mb-1">{type.label}</div>
                    <div className={`text-xs ${
                      selectedPolicyType === type.value 
                        ? 'text-blue-100' 
                        : 'text-accent dark:text-dark-muted'
                    }`}>
                      {type.description}
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 text-primary dark:text-blue-300">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z" />
                  </svg>
                  <span className="text-sm font-medium">
                    Selected: {policyTypes.find(t => t.value === selectedPolicyType)?.label}
                  </span>
                </div>
                <p className="text-xs text-primary dark:text-blue-300 mt-1">
                  AI analysis will be optimized for {selectedPolicyType} commercial insurance policies
                </p>
              </div>
            </div>
          </div>
        )}

        {mode === 'research' && (
          <div className="px-4 py-4">
            <div className="bg-white dark:bg-dark-surface border border-[#d0dee7] dark:border-dark-border rounded-lg p-6">
              <h3 className="text-lg font-bold text-secondary dark:text-dark-text mb-3">
                Generate Research Report
              </h3>
              <input
                type="text"
                placeholder="Enter URL"
                value={researchUrl}
                onChange={e => setResearchUrl(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-3"
              />
              <button
                onClick={handleGenerateReport}
                disabled={isGeneratingResearch}
                className={`bg-primary hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors ${isGeneratingResearch ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isGeneratingResearch ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        )}

        {/* Research Report Modal */}
        {showResearchModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-surface rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-bold text-secondary dark:text-dark-text">Research Report</h3>
                <button
                  onClick={() => setShowResearchModal(false)}
                  className="text-secondary dark:text-dark-text hover:text-accent px-2 py-1 rounded"
                >
                  Close
                </button>
              </div>
              <div className="p-4">
                {isGeneratingResearch ? (
                  <div className="text-center text-sm text-secondary dark:text-dark-text">Generating report...</div>
                ) : researchReportError ? (
                  <div className="text-center text-sm text-red-600">{researchReportError}</div>
                ) : (
                  <div ref={researchReportRef} className="prose max-w-none text-secondary dark:text-dark-text bg-white dark:bg-dark-surface p-2 rounded">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {researchReportContent}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              {!isGeneratingResearch && !researchReportError && (
                <div className="flex justify-end p-4 border-t gap-2">
                  <button
                    onClick={() => {
                      if (researchReportRef.current) {
                        html2pdf()
                          .from(researchReportRef.current)
                          .set({ filename: `research-report_${Date.now()}.pdf`, margin: 10 })
                          .save();
                      }
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
                  >
                    Download as PDF
                  </button>
                  <button
                    onClick={() => setShowResearchModal(false)}
                    className="px-4 py-2 bg-secondary text-white rounded-lg text-sm"
                  >
                    Close
                  </button>
                </div>
              )}
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
                Upload Your Commercial Insurance Documents
              </h3>
              <p className="text-accent dark:text-dark-muted mb-6">
                Drag and drop your business insurance policy documents here, or click to browse
              </p>
              
              {!showUploader ? (
                <button
                  onClick={() => setShowUploader(true)}
                  className="bg-primary hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Choose Files or Drag & Drop
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
                if (selectedDocuments.length > 0) {
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
                {selectedDocuments.length > 0 ? 'Click to analyze your policies via AI chat' : 'Upload documents first to receive intelligent risk analysis'}
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
                {selectedDocuments.length > 0 
                  ? 'Click to get AI-powered policy comparison and optimization' 
                  : 'Upload multiple policies to enable AI comparison'
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
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear the chat and uploaded documents? This cannot be undone.')) {
                        startNewSession();
                      }
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1 transition-colors"
                    title="Clear chat and documents"
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
          
          {/* Context-aware suggestions */}
          {selectedDocuments.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-medium text-secondary dark:text-dark-text mb-2">
                💡 Try asking about your {policyTypes.find(t => t.value === selectedPolicyType)?.label.toLowerCase()} policies:
              </h4>
              <div className="flex flex-wrap gap-2">
                {(policyPrompts[selectedPolicyType] ?? defaultPolicyPrompts).map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isLoading}
                    className="px-3 py-1 text-xs bg-white dark:bg-dark-bg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
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