import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import FileUploader, { UploadedFile } from '../components/FileUploader';
import ChatInterface, { ChatMessage } from '../components/ChatInterface';
import { useDocuments } from '../contexts/DocumentContext';
import { useAuth } from '../contexts/AuthContext';
import { aiService } from '../services/aiService';
import html2pdf from 'html2pdf.js';

type WizardStep = 'document-selection' | 'additional-facts' | 'generating-report' | 'view-report';

interface ProgressStatus {
  message: string;
  progress: number;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

const Comparison: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const {
    documents,
    addDocuments,
    selectedDocumentIds,
    chatHistory,
    setChatHistory
  } = useDocuments();

  const [currentStep, setCurrentStep] = useState<WizardStep>('document-selection');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [additionalFacts, setAdditionalFacts] = useState('');
  const [progressStatus, setProgressStatus] = useState<ProgressStatus>({ message: '', progress: 0 });
  const [comparisonReport, setComparisonReport] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);

  // Initialize selected documents from context
  useEffect(() => {
    setSelectedDocs(selectedDocumentIds);
  }, [selectedDocumentIds]);

  const handleDocumentSelection = (docId: string) => {
    setSelectedDocs(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const handleFilesUploaded = async (newFiles: UploadedFile[]) => {
    console.log('📄 Files uploaded:', newFiles.length);
    addDocuments(newFiles);

    // Extract text for each new file via backend
    await Promise.all(newFiles.map(async (file) => {
      if (file.file) {
        try {
          const formData = new FormData();
          formData.append('file', file.file);
          const res = await fetch(`${API_BASE_URL}/documents/extract`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
          });
          if (res.ok) {
            await res.json();
            // Note: We can't directly update the document here since it's managed by context
            console.log('Text extracted for', file.name);
          } else {
            console.error('Text extraction failed:', await res.text());
          }
        } catch (err) {
          console.error('Error extracting document text:', err);
        }
      }
    }));
  };

  const handleNextFromDocuments = () => {
    if (selectedDocs.length < 2) return;
    setCurrentStep('additional-facts');
  };

  const handleBackToDocuments = () => {
    setCurrentStep('document-selection');
  };

  const handleNextFromFacts = async () => {
    setCurrentStep('generating-report');
    setIsGenerating(true);
    setError(null);

    try {
      // Simulate progress updates
      setProgressStatus({ message: 'Analyzing documents...', progress: 25 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      setProgressStatus({ message: 'Comparing coverages...', progress: 50 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      setProgressStatus({ message: 'Generating recommendations...', progress: 75 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get selected documents with their content
      const selectedDocuments = documents.filter(doc => selectedDocs.includes(doc.id));
      
      // Create comparison report request
      const reportRequest = {
        documentIds: selectedDocs,
        additionalFacts: additionalFacts,
        documents: selectedDocuments.map(doc => ({
          id: doc.id,
          name: doc.name,
          extractedText: doc.extractedText || ''
        }))
      };

      // Call backend API for comparison report generation
      const response = await fetch(`${API_BASE_URL}/comparison/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reportRequest)
      });

      if (!response.ok) {
        throw new Error('Failed to generate comparison report');
      }

      const result = await response.json();
      
      setProgressStatus({ message: 'Finalizing report...', progress: 100 });
      await new Promise(resolve => setTimeout(resolve, 500));

      setComparisonReport(result.report || 'Comparison report generated successfully.');
      
      // Initialize chat with report context
      const initialMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        content: `I've generated a comprehensive comparison report for your selected documents. The report includes detailed analysis, coverage comparisons, and recommendations. Feel free to ask me any questions about the findings!`,
        sender: 'ai',
        timestamp: new Date()
      };

      setChatHistory([initialMessage]);
      setCurrentStep('view-report');

    } catch (err) {
      console.error('Report generation failed:', err);
      setError('Failed to generate comparison report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendChatMessage = async (message: string) => {
    if (!comparisonReport) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      content: message,
      sender: 'user',
      timestamp: new Date()
    };

    setChatHistory(prev => [...prev, userMessage]);

    // Create context with the report
    const contextualPrompt = `
Based on the following comparison report and user question, provide a helpful response:

COMPARISON REPORT:
${comparisonReport}

USER QUESTION: ${message}

Please provide a detailed and helpful response based on the report content.
`;

    try {
      let aiResponse = '';
      
      await aiService.sendRawPrompt(contextualPrompt, (chunk: string) => {
        aiResponse = chunk;
        
        // Update AI message in real-time
        setChatHistory(prev => {
          const withoutLastAI = prev.filter(msg => msg.id !== 'ai_response_temp');
          return [
            ...withoutLastAI,
            {
              id: 'ai_response_temp',
              content: aiResponse,
              sender: 'ai' as const,
              timestamp: new Date()
            }
          ];
        });
      });

      // Finalize AI message with proper ID
      setChatHistory(prev => {
        const withoutTemp = prev.filter(msg => msg.id !== 'ai_response_temp');
        return [
          ...withoutTemp,
          {
            id: `msg_${Date.now()}_ai`,
            content: aiResponse,
            sender: 'ai' as const,
            timestamp: new Date()
          }
        ];
      });

    } catch (error) {
      console.error('Chat message failed:', error);
      
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        content: 'I apologize, but I encountered an error processing your message. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      };

      setChatHistory(prev => [...prev, errorMessage]);
    }
  };

  const handleExportPDF = async () => {
    if (!comparisonReport || !reportContentRef.current) return;

    try {
      // Clone the actual rendered content from the DOM
      const originalContent = reportContentRef.current;
      const clonedContent = originalContent.cloneNode(true) as HTMLElement;
      
      // Create a container for the PDF with proper styling and page break handling
      const pdfContainer = document.createElement('div');
      pdfContainer.style.cssText = `
        font-family: Arial, sans-serif;
        line-height: 1.5;
        color: #333;
        max-width: 750px;
        margin: 0 auto;
        padding: 30px;
        background: white;
      `;

      // Add comprehensive CSS for page breaks
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        @media print {
          * {
            color: #333 !important;
            background: transparent !important;
          }
          
          /* Prevent awkward page breaks */
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
            page-break-inside: avoid;
            break-after: avoid;
            break-inside: avoid;
          }
          
          p, li {
            page-break-inside: avoid;
            break-inside: avoid;
            orphans: 3;
            widows: 3;
          }
          
          table {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          blockquote {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          pre, code {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          ul, ol {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Ensure sufficient space before page breaks */
          h1 { margin-top: 30px; margin-bottom: 20px; }
          h2 { margin-top: 25px; margin-bottom: 15px; }
          h3 { margin-top: 20px; margin-bottom: 10px; }
          p { margin-bottom: 12px; }
          
          /* Force page breaks before major sections if needed */
          .page-break-before {
            page-break-before: always;
            break-before: page;
          }
        }
      `;

      // Add header with page break protection
      const header = document.createElement('div');
      header.style.cssText = `
        page-break-inside: avoid;
        break-inside: avoid;
        margin-bottom: 30px;
      `;
      header.innerHTML = `
        <h1 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; page-break-after: avoid;">
          Insurance Policy Comparison Report
        </h1>
        <p style="color: #666; margin-bottom: 20px; font-size: 14px; page-break-after: avoid;">
          Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </p>
      `;

      // Apply PDF-friendly styles to the cloned content
      clonedContent.style.cssText = `
        font-size: 13px;
        line-height: 1.5;
        color: #333;
      `;

      // Fix any dark mode styles and add page break protection to elements
      const allElements = clonedContent.querySelectorAll('*');
      allElements.forEach(el => {
        const element = el as HTMLElement;
        element.style.color = '#333';
        element.style.backgroundColor = 'transparent';
        
        // Add page break protection to specific elements
        if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName)) {
          element.style.pageBreakAfter = 'avoid';
          element.style.pageBreakInside = 'avoid';
          element.style.breakAfter = 'avoid';
          element.style.breakInside = 'avoid';
        }
        
        if (['P', 'LI', 'TD', 'TH'].includes(element.tagName)) {
          element.style.pageBreakInside = 'avoid';
          element.style.breakInside = 'avoid';
        }
        
        if (['TABLE', 'BLOCKQUOTE', 'PRE', 'UL', 'OL'].includes(element.tagName)) {
          element.style.pageBreakInside = 'avoid';
          element.style.breakInside = 'avoid';
        }
      });

      // Append style and content
      pdfContainer.appendChild(styleElement);
      pdfContainer.appendChild(header);
      pdfContainer.appendChild(clonedContent);

      const opt = {
        margin: [0.75, 0.5, 0.75, 0.5], // top, left, bottom, right
        filename: `comparison-report-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { 
          type: 'jpeg', 
          quality: 0.95 
        },
        html2canvas: { 
          scale: 1.5, // Reduced scale for better performance and less splitting
          useCORS: true,
          allowTaint: true,
          letterRendering: true,
          logging: false,
          height: null, // Let it auto-calculate
          width: null   // Let it auto-calculate
        },
        jsPDF: { 
          unit: 'in', 
          format: 'letter', 
          orientation: 'portrait',
          compress: true
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy']
        }
      };

      await html2pdf().from(pdfContainer).set(opt).save();
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleExportDOC = () => {
    if (!comparisonReport || !reportContentRef.current) return;

    try {
      // Get the actual rendered HTML content
      const originalContent = reportContentRef.current;
      const clonedContent = originalContent.cloneNode(true) as HTMLElement;
      
      // Clean up styles for Word document
      const allElements = clonedContent.querySelectorAll('*');
      allElements.forEach(el => {
        const element = el as HTMLElement;
        // Remove any classes that might interfere
        element.removeAttribute('class');
        // Set basic styling
        if (element.tagName === 'H1') element.style.cssText = 'color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-top: 20px;';
        if (element.tagName === 'H2') element.style.cssText = 'color: #1e40af; margin-top: 20px; margin-bottom: 10px;';
        if (element.tagName === 'H3') element.style.cssText = 'color: #1e40af; margin-top: 15px; margin-bottom: 8px;';
        if (element.tagName === 'P') element.style.cssText = 'margin-bottom: 10px; line-height: 1.6;';
        if (element.tagName === 'UL' || element.tagName === 'OL') element.style.cssText = 'margin-bottom: 10px; padding-left: 20px;';
        if (element.tagName === 'LI') element.style.cssText = 'margin-bottom: 5px;';
      });

      // Create Word document content
      const docContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Insurance Policy Comparison Report</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; color: #333; }
            h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
            h2 { color: #1e40af; margin-top: 30px; }
            h3 { color: #1e3a8a; margin-top: 20px; }
            p { margin-bottom: 10px; }
            ul, ol { margin-bottom: 10px; padding-left: 20px; }
            li { margin-bottom: 5px; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            code { background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
            pre { background-color: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
            blockquote { border-left: 4px solid #ddd; margin: 16px 0; padding-left: 16px; color: #666; }
          </style>
        </head>
        <body>
          <h1>Insurance Policy Comparison Report</h1>
          <p><strong>Generated:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <hr>
          ${clonedContent.innerHTML}
        </body>
        </html>
      `;

      const blob = new Blob([docContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `comparison-report-${new Date().toISOString().split('T')[0]}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('DOC export failed:', error);
      alert('Failed to export Word document. Please try again.');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'document-selection':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-secondary dark:text-dark-text mb-4">
                Select Documents to Compare
              </h2>
              <p className="text-accent dark:text-dark-muted mb-6">
                Choose at least two documents to compare. You can select from existing documents or upload new ones.
              </p>
            </div>

            {/* Existing Documents */}
            <div className="bg-white dark:bg-dark-bg border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-secondary dark:text-dark-text mb-4">
                Existing Documents
              </h3>
              
              {documents.length === 0 ? (
                <p className="text-accent dark:text-dark-muted text-center py-8">
                  No documents available. Upload some documents below to get started.
                </p>
              ) : (
                <div className="grid gap-3">
                  {documents.map((doc) => (
                    <label
                      key={doc.id}
                      className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocs.includes(doc.id)}
                        onChange={() => handleDocumentSelection(doc.id)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-secondary dark:text-dark-text">
                            {doc.name}
                          </span>
                          <span className="text-sm text-accent dark:text-dark-muted">
                            {(doc.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                        <div className="text-sm text-accent dark:text-dark-muted">
                          Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Upload New Documents */}
            <div className="bg-white dark:bg-dark-bg border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-secondary dark:text-dark-text mb-4">
                Upload New Documents
              </h3>
              <FileUploader onFilesUploaded={handleFilesUploaded} />
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 text-accent dark:text-dark-muted hover:text-secondary dark:hover:text-dark-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNextFromDocuments}
                disabled={selectedDocs.length < 2}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Next ({selectedDocs.length}/2+ selected)
              </button>
            </div>
          </div>
        );

      case 'additional-facts':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-secondary dark:text-dark-text mb-4">
                Additional Context
              </h2>
              <p className="text-accent dark:text-dark-muted mb-6">
                Provide any additional context, facts, or specific aspects you'd like the comparison to focus on.
              </p>
            </div>

            <div className="bg-white dark:bg-dark-bg border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <label className="block text-sm font-medium text-secondary dark:text-dark-text mb-3">
                Additional Facts and Context
              </label>
              <textarea
                value={additionalFacts}
                onChange={(e) => setAdditionalFacts(e.target.value)}
                placeholder="Enter any specific requirements, business context, coverage priorities, or questions you'd like addressed in the comparison..."
                className="w-full h-40 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-secondary dark:text-dark-text placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
              <p className="text-sm text-accent dark:text-dark-muted mt-2">
                This information will help generate a more targeted and relevant comparison report.
              </p>
            </div>

            {/* Selected Documents Summary */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-secondary dark:text-dark-text mb-2">
                Documents to Compare ({selectedDocs.length})
              </h4>
              <div className="space-y-1">
                {documents
                  .filter(doc => selectedDocs.includes(doc.id))
                  .map(doc => (
                    <div key={doc.id} className="text-sm text-accent dark:text-dark-muted">
                      • {doc.name}
                    </div>
                  ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleBackToDocuments}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-secondary dark:text-dark-text rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNextFromFacts}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Generate Report
              </button>
            </div>
          </div>
        );

      case 'generating-report':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-secondary dark:text-dark-text mb-4">
                Generating Comparison Report
              </h2>
              <p className="text-accent dark:text-dark-muted mb-8">
                Please wait while we analyze your documents and generate a comprehensive comparison report.
              </p>
            </div>

            <div className="bg-white dark:bg-dark-bg border border-gray-200 dark:border-gray-700 rounded-lg p-8">
              <div className="flex flex-col items-center space-y-6">
                {/* Progress Bar */}
                <div className="w-full max-w-md">
                  <div className="flex justify-between text-sm text-accent dark:text-dark-muted mb-2">
                    <span>Progress</span>
                    <span>{progressStatus.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progressStatus.progress}%` }}
                    />
                  </div>
                </div>

                {/* Status Message */}
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                  <p className="text-lg font-medium text-secondary dark:text-dark-text">
                    {progressStatus.message}
                  </p>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 w-full max-w-md">
                    <p className="text-red-700 dark:text-red-400 text-center">{error}</p>
                    <button
                      onClick={() => {
                        setError(null);
                        setCurrentStep('additional-facts');
                      }}
                      className="mt-3 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'view-report':
        return (
          <div className="h-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: 'calc(100vh - 120px)' }}>
              {/* Left Column - Report (2/3 width) */}
              <div className="lg:col-span-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-secondary dark:text-dark-text">
                      Comparison Report
                    </h3>
                    {comparisonReport && (
                      <div className="relative">
                        <button
                          onClick={() => setShowExportMenu(!showExportMenu)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                          </svg>
                          Export
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7,10L12,15L17,10H7Z" />
                          </svg>
                        </button>
                        
                        {showExportMenu && (
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg shadow-lg z-50">
                            <div className="p-1">
                              <button
                                onClick={() => {
                                  handleExportPDF();
                                  setShowExportMenu(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-secondary dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex items-center gap-2"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-red-600">
                                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                </svg>
                                Export as PDF
                              </button>
                              <button
                                onClick={() => {
                                  handleExportDOC();
                                  setShowExportMenu(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-secondary dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex items-center gap-2"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600">
                                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                </svg>
                                Export as Word Document
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-gray-900">
                  <div className="max-w-4xl mx-auto bg-white dark:bg-dark-bg shadow-lg rounded-lg p-8">
                    <div className="text-base leading-relaxed text-secondary dark:text-dark-text">
                      <div ref={reportContentRef} className="overflow-x-auto markdown-content">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight, rehypeKatex]}
                        >
                          {comparisonReport}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Chat */}
              <div className="bg-white dark:bg-dark-bg border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <h3 className="font-semibold text-secondary dark:text-dark-text">
                    Ask Questions About the Report
                  </h3>
                </div>
                <div className="flex-1 min-h-0">
                  <ChatInterface
                    messages={chatHistory}
                    onSendMessage={handleSendChatMessage}
                    isLoading={false}
                  />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-secondary dark:text-dark-text rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Back to Home
              </button>
              <button
                onClick={() => {
                  // Reset wizard for new comparison
                  setCurrentStep('document-selection');
                  setSelectedDocs([]);
                  setAdditionalFacts('');
                  setComparisonReport('');
                  setChatHistory([]);
                  setError(null);
                  setShowExportMenu(false);
                }}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Start New Comparison
              </button>
            </div>

            {/* Click outside to close export menu */}
            {showExportMenu && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowExportMenu(false)}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Prevent access for non-licensed users
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

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto">
      {/* Progress Indicator - Hide on view-report step */}
      {currentStep !== 'view-report' && (
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {(['document-selection', 'additional-facts', 'generating-report', 'view-report'] as WizardStep[]).map((step, index) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep === step
                        ? 'bg-primary text-white'
                        : (['document-selection', 'additional-facts', 'generating-report', 'view-report'] as WizardStep[]).indexOf(currentStep) > index
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {(['document-selection', 'additional-facts', 'generating-report', 'view-report'] as WizardStep[]).indexOf(currentStep) > index ? '✓' : index + 1}
                  </div>
                  {index < 3 && (
                    <div
                      className={`w-16 h-1 mx-2 ${
                        (['document-selection', 'additional-facts', 'generating-report', 'view-report'] as WizardStep[]).indexOf(currentStep) > index
                          ? 'bg-green-500'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex space-x-20 mt-2">
            <span className="text-sm text-secondary dark:text-dark-text">Select Documents</span>
            <span className="text-sm text-secondary dark:text-dark-text">Add Context</span>
            <span className="text-sm text-secondary dark:text-dark-text">Generate Report</span>
            <span className="text-sm text-secondary dark:text-dark-text">Review & Chat</span>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className={`flex-1 ${currentStep === 'view-report' ? 'h-full' : ''}`}>
        {renderStepContent()}
      </div>
    </div>
  );
};

export default Comparison;