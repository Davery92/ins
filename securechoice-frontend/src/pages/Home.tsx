import React, { useState, useEffect } from 'react';
import ChatInterface, { ChatMessage } from '../components/ChatInterface';
import ApiStatus from '../components/ApiStatus';
import FileUploader, { UploadedFile } from '../components/FileUploader';
import Dashboard from '../components/Dashboard';
import OnboardingTour from '../components/OnboardingTour';
import { useDocuments } from '../contexts/DocumentContext';
import { useAuth } from '../contexts/AuthContext';
import { aiService } from '../services/aiService';

const Home: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const { user, token } = useAuth();
  const { 
    documents, 
    addDocuments, 
    selectedPolicyType,
    setSelectedPolicyType,
    chatHistory,
    setChatHistory,
    addChatMessage,
    clearChatHistory,
    exportChatHistory
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
    { value: 'commercial-property', label: 'Commercial Property', description: 'Building and equipment coverage' },
    { value: 'workers-comp', label: 'Workers Compensation', description: 'Employee injury protection' },
    { value: 'professional-liability', label: 'Professional Liability', description: 'Errors & omissions coverage' },
    { value: 'cyber-liability', label: 'Cyber Liability', description: 'Data breach and cyber protection' },
    { value: 'commercial-auto', label: 'Commercial Auto', description: 'Business vehicle coverage' },
    { value: 'business-interruption', label: 'Business Interruption', description: 'Lost income protection' },
    { value: 'directors-officers', label: 'Directors & Officers', description: 'Executive liability coverage' }
  ];

  const getPolicySpecificPrompts = (policyType: string) => {
    const prompts = {
      'general-liability': [
        "Analyze my general liability coverage limits and exclusions",
        "What gaps exist in my business liability protection?",
        "Review my aggregate and per-occurrence limits",
        "Assess product liability and premises coverage"
      ],
      'commercial-property': [
        "Evaluate my building and equipment coverage limits",
        "Review business personal property protection",
        "What natural disaster coverage do I have?",
        "Assess replacement cost vs actual cash value coverage"
      ],
      'workers-comp': [
        "Analyze my workers compensation coverage by class code",
        "Review experience modification factors and rates",
        "What return-to-work programs are available?",
        "Assess coverage for independent contractors"
      ],
      'professional-liability': [
        "Review errors and omissions coverage limits",
        "Analyze professional liability exclusions and scope",
        "What prior acts coverage do I have?",
        "Assess coverage for cyber professional liability"
      ],
      'cyber-liability': [
        "Evaluate data breach response and notification coverage",
        "Review cyber extortion and ransomware protection",
        "What business interruption cyber coverage exists?",
        "Assess third-party cyber liability limits"
      ],
      'commercial-auto': [
        "Analyze commercial vehicle liability limits",
        "Review hired and non-owned auto coverage",
        "What fleet safety programs reduce premiums?",
        "Assess cargo and equipment coverage"
      ],
      'business-interruption': [
        "Review business income and extra expense coverage",
        "Analyze waiting period and coverage triggers",
        "What contingent business interruption coverage exists?",
        "Assess civil authority and ingress/egress coverage"
      ],
      'directors-officers': [
        "Evaluate D&O coverage for entity vs individual",
        "Review employment practices liability coverage",
        "What fiduciary liability protection exists?",
        "Assess side A, B, and C coverage differences"
      ]
    };
    return prompts[policyType as keyof typeof prompts] || [
      "Analyze the key coverage areas in my commercial policy",
      "What are the main business risks and limitations?",
      "Review policy limits and deductibles",
      "Assess overall commercial protection gaps"
    ];
  };

  const handleFilesUploaded = async (newFiles: UploadedFile[]) => {
    console.log('📄 Files uploaded:', newFiles.length);
    
    addDocuments(newFiles);
    setShowUploader(false);

    // Update AI service context
    const allDocumentNames = documents.map(d => d.name).concat(newFiles.map(f => f.name));
    aiService.updatePolicyContext(allDocumentNames);

    // Automatically trigger analysis in chat
    const policyTypeLabel = policyTypes.find(t => t.value === selectedPolicyType)?.label || 'Commercial';
    const analysisMessage = `I've uploaded ${newFiles.length} ${policyTypeLabel.toLowerCase()} policy document(s): ${newFiles.map(f => f.name).join(', ')}. Please analyze these documents and provide insights on coverage, gaps, and recommendations.`;
    
    // Trigger the analysis in chat
    setTimeout(() => {
      handleSendMessage(analysisMessage);
    }, 500);
  };

  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleSendMessage = async (message: string) => {
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
    setChatHistory(prev => [...prev, aiMessage]);

    try {
      // Update AI service with current document context before sending message
      if (documents.length > 0) {
        const documentNames = documents.map(d => d.name);
        aiService.updatePolicyContext(documentNames);
      }

      // Enhance the user message with context about uploaded documents
      let contextualMessage = message;
      if (documents.length > 0) {
        let contextInfo = `\n\nUser Context: I have uploaded ${documents.length} commercial insurance document(s): ${documents.map(d => d.name).join(', ')}.`;
        contextInfo += ` Policy type focus: ${policyTypes.find(t => t.value === selectedPolicyType)?.label || 'General Commercial'}.`;
        contextualMessage = message + contextInfo;
      }

      let finalAiContent = '';
      await aiService.sendMessage(contextualMessage, (streamContent) => {
        finalAiContent = streamContent;
        setChatHistory(prev => 
          prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, content: streamContent }
              : msg
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

      setChatHistory(prev => 
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

      setChatHistory(prev => 
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOnboarding(true)}
              className="text-primary hover:text-blue-600 text-sm font-medium flex items-center gap-2 transition-colors"
              title="Show guided tour (F1)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11,18H13V16H11V18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z" />
              </svg>
              Help
            </button>
            <div className="text-xs text-accent dark:text-dark-muted">
              <div>⌘K: Focus Chat</div>
              <div>⌘U: Upload</div>
              <div>F1: Help</div>
            </div>
          </div>
        </div>

        {/* Policy Type Selector */}
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
        {documents.length > 0 && (
          <div className="px-4 py-4">
            <h3 className="text-lg font-bold text-secondary dark:text-dark-text mb-3">
              Uploaded Documents ({documents.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.map((doc) => (
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
              onClick={() => setShowUploader(true)}
            >
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </div>
              <h3 className="font-semibold text-secondary dark:text-dark-text mb-2">Upload Commercial Policies</h3>
              <p className="text-accent dark:text-dark-muted text-sm">
                Upload your business insurance documents for AI analysis
              </p>
            </div>

            <div 
              className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-lg p-6 cursor-pointer hover:shadow-md transition-all"
              onClick={() => {
                if (documents.length > 0) {
                  handleSendMessage("Please analyze my uploaded commercial insurance policies and provide a comprehensive risk assessment.");
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
                {documents.length > 0 ? 'Click to analyze your policies via AI chat' : 'Upload documents first to receive intelligent risk analysis'}
              </p>
            </div>

            <div 
              className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border border-amber-200 dark:border-amber-700 rounded-lg p-6 cursor-pointer hover:shadow-md transition-all"
              onClick={() => documents.length > 0 && handleSendMessage("Please compare my commercial insurance policies and recommend the best coverage options.")}
            >
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z" />
                </svg>
              </div>
              <h3 className="font-semibold text-secondary dark:text-dark-text mb-2">Compare & Optimize</h3>
              <p className="text-accent dark:text-dark-muted text-sm">
                {documents.length > 0 
                  ? 'Click to get AI-powered policy comparison and optimization' 
                  : 'Upload multiple policies to enable AI comparison'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Business Intelligence Dashboard */}
        {documents.length > 0 && (
          <div className="px-4 py-6" data-tour="dashboard">
            <Dashboard />
          </div>
        )}

        {/* AI Chat Interface */}
        <div className="px-4 py-6" data-tour="chat-interface">
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
                      if (window.confirm('Are you sure you want to clear the chat history? This cannot be undone.')) {
                        clearChatHistory();
                      }
                    }}
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
          
          {/* Context-aware suggestions */}
          {documents.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-medium text-secondary dark:text-dark-text mb-2">
                💡 Try asking about your {policyTypes.find(t => t.value === selectedPolicyType)?.label.toLowerCase()} policies:
              </h4>
              <div className="flex flex-wrap gap-2">
                {getPolicySpecificPrompts(selectedPolicyType).map((prompt, index) => (
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
          
          <div className="h-96">
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