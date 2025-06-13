import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import FileUploader, { UploadedFile } from '../components/FileUploader';
import ChatInterface, { ChatMessage, CitationClick } from '../components/ChatInterface';
import PdfViewer, { CitationHighlight } from '../components/PdfViewer';
import { useDocuments } from '../contexts/DocumentContext';
import { useAuth } from '../contexts/AuthContext';
import { aiService } from '../services/aiService';
import { spansToPrompt } from '../utils/spansToPrompt';
import html2pdf from 'html2pdf.js';

type WizardStep = 'document-selection' | 'additional-facts' | 'generating-report' | 'view-report';

interface ProgressStatus {
  message: string;
  progress: number;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

const Comparison: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);
  const [clickedCitation, setClickedCitation] = useState<CitationClick | null>(null);
  const [highlight, setHighlight] = useState<CitationHighlight | null>(null);

  // Initialize selected documents from context
  useEffect(() => {
    setSelectedDocs(selectedDocumentIds);
  }, [selectedDocumentIds]);

  // Handle loading existing report from navigation state or URL
  useEffect(() => {
    console.log('🔄 Comparison component mounted/updated');
    
    const urlParams = new URLSearchParams(location.search);
    const reportId = urlParams.get('reportId');
    
    if (reportId) {
      console.log('📊 Found reportId in URL, loading existing report...');
      
      // Try navigation state first
      const state = location.state as any;
      if (state?.reportData?.isExistingReport) {
        console.log('📊 Loading from navigation state');
        loadExistingReport(state.reportData);
        return;
      }
      
      // Try sessionStorage as fallback
      const storedData = sessionStorage.getItem('comparison-report-data');
      if (storedData) {
        try {
          const reportData = JSON.parse(storedData);
          console.log('📊 Loading from sessionStorage');
          loadExistingReport(reportData);
          sessionStorage.removeItem('comparison-report-data'); // Clean up
          return;
        } catch (error) {
          console.error('Error parsing stored report data:', error);
        }
      }
      
      // Fallback: fetch the report from the API
      console.log('📊 No local data found, fetching report from API...');
      fetchReportFromAPI(reportId);
    }
  }, [location, setChatHistory]);

  const fetchReportFromAPI = async (reportId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/comparison-reports/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const report = await response.json();
        console.log('📊 Successfully fetched report from API:', report.title);
        
        const reportDataPayload = {
          report: report.content,
          reportTitle: report.title,
          documentIds: report.documentIds,
          documentNames: report.documentNames,
          primaryPolicyType: report.primaryPolicyType,
          additionalFacts: report.additionalFacts,
          isExistingReport: true
        };
        
        loadExistingReport(reportDataPayload);
      } else {
        console.error('Failed to fetch report from API:', await response.text());
        setError('Failed to load the comparison report. The report may have been deleted or you may not have permission to access it.');
      }
    } catch (error) {
      console.error('Error fetching report from API:', error);
      setError('Failed to load the comparison report. Please check your connection and try again.');
    }
  };

  const loadExistingReport = (reportData: any) => {
    console.log('📊 Loading existing report:', reportData.reportTitle);
    
    // Validate that we have the required data
    if (!reportData.report || !reportData.reportTitle) {
      console.error('❌ Invalid report data:', reportData);
      setError('Invalid report data. Please try selecting the report again.');
      return;
    }
    
    setComparisonReport(reportData.report || '');
    setSelectedDocs(reportData.documentIds || []);
    setAdditionalFacts(reportData.additionalFacts || '');
    setCurrentStep('view-report');
    
    // Initialize chat with report context
    const initialMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      content: `I've loaded the comparison report "${reportData.reportTitle}". This report analyzes ${reportData.documentNames?.join(', ') || 'your selected documents'}. Feel free to ask me any questions about the findings or the original documents!`,
      sender: 'ai',
      timestamp: new Date()
    };

    setChatHistory([initialMessage]);
    console.log('✅ Report loaded successfully');
  };

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
      
      // Import prompt mapping utilities
      const { determinePrimaryPolicyType } = await import('../utils/promptMapping');
      
      // Determine the primary policy type from selected documents
      const primaryPolicyType = determinePrimaryPolicyType(selectedDocuments);
      console.log('🔍 Comparison page - Primary policy type:', primaryPolicyType);
      
      // Create comparison report request
      const reportRequest = {
        documentIds: selectedDocs,
        additionalFacts: additionalFacts,
        primaryPolicyType: primaryPolicyType,
        documents: selectedDocuments.map(doc => ({
          id: doc.id,
          name: doc.name,
          policyType: doc.policyType,
          extractedText: doc.extractedText || ''
        }))
      };

      console.log('📊 Generating comparison report for documents:', selectedDocuments.map(d => d.name));

      setProgressStatus({ message: 'Finalizing report...', progress: 90 });

      // Generate the comparison report via backend API
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
      const reportContent = result.report || 'Comparison report generated successfully.';

      setProgressStatus({ message: 'Saving report...', progress: 95 });

      // Save to backend
      const documentNames = selectedDocuments.map(doc => doc.name);
      const reportTitle = `Comparison Report - ${documentNames.join(' vs ')}`;

      try {
        const saveResponse = await fetch(`${API_BASE_URL}/comparison-reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: reportTitle,
            content: reportContent,
            documentNames: documentNames,
            documentIds: selectedDocs,
            primaryPolicyType: primaryPolicyType,
            additionalFacts: additionalFacts
          })
        });

        if (saveResponse.ok) {
          const savedReport = await saveResponse.json();
          console.log('✅ Report saved successfully:', savedReport.id);
        } else {
          console.error('Failed to save report:', await saveResponse.text());
        }
      } catch (saveError) {
        console.error('Error saving report:', saveError);
        // Continue anyway - the report was generated successfully
      }

      setProgressStatus({ message: 'Complete!', progress: 100 });
      setComparisonReport(reportContent);

      // Initialize chat with report context
      const initialMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        content: `I've generated your comparison report analyzing ${documentNames.join(', ')}. The report covers key differences, similarities, and recommendations. Feel free to ask me any questions about the findings!`,
        sender: 'ai',
        timestamp: new Date()
      };

      setChatHistory([initialMessage]);
      setCurrentStep('view-report');

    } catch (error) {
      console.error('Error generating report:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate report');
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

    // Get selected documents for context - handle case where documents might not be available
    const selectedDocuments = documents.filter(doc => selectedDocs.includes(doc.id));
    
    // Build spans context for selected documents
    const spanBlocks = await Promise.all(
      selectedDocuments.map(async doc => {
        const res = await fetch(`${API_BASE_URL}/documents/${doc.id}/spans`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const spans = res.ok ? await res.json() : [];
        return spansToPrompt(doc.id, spans);
      })
    );
    const docContext = spanBlocks.join('\n\n');
    // Create comprehensive context with both the report AND the original documents (if available)
    let contextualPrompt = '';
    
    if (selectedDocuments.length > 0) {
      const documentTexts = selectedDocuments.map((doc, index) =>
        `DOCUMENT ${index + 1}: ${doc.name} (Policy Type: ${doc.policyType || 'Unknown'})
${doc.extractedText || 'Unable to extract text from this document.'}`
      ).join('\n\n---\n\n');

      contextualPrompt = `Based on the following comparison report, original documents (with span metadata), and user question, provide a helpful response:

DOCUMENT SPANS:
${docContext}

COMPARISON REPORT:
${comparisonReport}

ORIGINAL DOCUMENTS:
${documentTexts}

USER QUESTION: ${message}

Please provide a detailed and helpful response based on both the comparison report and the original document content.
`;
    } else {
      // Fallback when documents are not available - use report only
      contextualPrompt = `Based on the following comparison report and user question, provide a helpful response (no original documents available):

COMPARISON REPORT:
${comparisonReport}

USER QUESTION: ${message}

Please provide a detailed and helpful response based on the comparison report content.
`;
    }

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

  const handleExportPDF = () => {
    if (!comparisonReport || !reportContentRef.current) return;

    // Open a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Get the inner HTML of the report content
    const contentHTML = reportContentRef.current.innerHTML;

    // Write styled HTML to the print window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Insurance Policy Comparison Report</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; color: #333; }
            h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
            h2, h3, h4, h5, h6 { color: #2563eb; }
            p { margin: 10px 0; }
            ul, ol { margin: 10px 0; padding-left: 30px; }
            pre, code { background: #f4f4f4; padding: 10px; border-radius: 5px; }
            blockquote { border-left: 4px solid #2563eb; margin: 10px 0; padding-left: 15px; background: #f8f9fa; }
            @media print {
              body { margin: 0; }
              h1 { page-break-before: avoid; }
              h2, h3 { page-break-after: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>Insurance Policy Comparison Report</h1>
          <p><strong>Generated:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          ${contentHTML}
        </body>
      </html>
    `);
    printWindow.document.close();

    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
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

  const handleCitationClick = async (citation: CitationClick) => {
    setClickedCitation(citation);
    try {
      // First, get fresh download URL for the document
      const urlResponse = await fetch(`${API_BASE_URL}/documents/${citation.docId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (urlResponse.ok) {
        const { downloadUrl } = await urlResponse.json();
        
        // Update the document in our local state with the fresh URL
        const updatedDocuments = documents.map(doc => 
          doc.id === citation.docId ? { ...doc, fileUrl: downloadUrl } : doc
        );
        addDocuments(updatedDocuments.filter(doc => !documents.find(d => d.id === doc.id)));
      }
      
      // Then fetch spans for highlighting
      const spansResponse = await fetch(`${API_BASE_URL}/documents/${citation.docId}/spans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (spansResponse.ok) {
        const spans: Array<{ pageNumber: number; bbox: [number, number, number, number]; startOffset: number; endOffset: number }> = await spansResponse.json();
        const match = spans.find(s => s.pageNumber === citation.page && s.startOffset === citation.start && s.endOffset === citation.end);
        if (match) {
          setHighlight({ page: citation.page, bbox: match.bbox });
        }
      }
    } catch (err) {
      console.error('Failed to fetch citation data:', err);
    }
  };

  const renderViewReport = () => {
    console.log('🎨 Rendering view-report case');
    return (
      <div className="w-full min-h-screen bg-slate-50 dark:bg-dark-bg">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[800px] max-w-[95vw] mx-auto px-4">
          {/* Left Column - Report (2/3 width) */}
          <div className="lg:col-span-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-secondary dark:text-dark-text">
                    Document Comparison Report
                  </h3>
                  <p className="text-sm text-accent dark:text-dark-muted">
                    Comparing {selectedDocs.length} documents • Generated {new Date().toLocaleDateString()}
                  </p>
                </div>
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
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg shadow-lg z-[60]">
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
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900 min-h-[600px]">
              <div className="w-full bg-white dark:bg-dark-bg shadow-lg rounded-lg p-8">
                <div className="text-base leading-relaxed text-secondary dark:text-dark-text">
                  {error ? (
                    <div className="text-center py-12">
                      <div className="text-red-500 text-6xl mb-4">⚠️</div>
                      <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
                        Error Loading Report
                      </h3>
                      <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                      <button
                        onClick={() => navigate('/')}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Return to Home
                      </button>
                    </div>
                  ) : !comparisonReport ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <h3 className="text-lg font-semibold text-secondary dark:text-dark-text mb-2">
                        Loading Report...
                      </h3>
                      <p className="text-accent dark:text-dark-muted">
                        Please wait while we load your comparison report.
                      </p>
                    </div>
                  ) : (
                    <div ref={reportContentRef} className="overflow-x-scroll markdown-content" style={{ overflowX: 'scroll' }}>
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight, rehypeKatex]}
                      >
                        {comparisonReport}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Comparison Tools */}
          <div className="bg-white dark:bg-dark-bg border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col min-h-[800px]">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h3 className="font-semibold text-secondary dark:text-dark-text">
                Comparison Tools
              </h3>
            </div>
            <div className="flex-1 p-4 space-y-4">
              {/* Quick Actions */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-secondary dark:text-dark-text">Quick Actions</h4>
                <div className="space-y-2">
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
                    className="w-full px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Start New Comparison
                  </button>
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Export Report
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Back to Home
                  </button>
                </div>
              </div>

              {/* Document Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-secondary dark:text-dark-text">Documents Compared</h4>
                <div className="space-y-2">
                  {documents.filter(doc => selectedDocs.includes(doc.id)).map((doc, index) => (
                    <div key={doc.id} className="text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                      <div className="font-medium text-secondary dark:text-dark-text truncate">
                        {index + 1}. {doc.name}
                      </div>
                      <div className="text-xs text-accent dark:text-dark-muted">
                        {doc.policyType || 'Unknown Policy'} • {(doc.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comparison Insights */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-secondary dark:text-dark-text">Comparison Insights</h4>
                <div className="text-xs text-accent dark:text-dark-muted space-y-2">
                  <p>• Review coverage differences carefully</p>
                  <p>• Pay attention to policy limits and deductibles</p>
                  <p>• Note any exclusions or special conditions</p>
                  <p>• Compare premium costs and payment terms</p>
                  <p>• Look for additional benefits or riders</p>
                </div>
              </div>

              {/* Chat Interface */}
              <div className="space-y-3 flex-1 flex flex-col">
                <h4 className="text-sm font-medium text-secondary dark:text-dark-text">Ask Questions</h4>
                <div className="flex-1 min-h-[300px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <ChatInterface
                    messages={chatHistory}
                    onSendMessage={handleSendChatMessage}
                    isLoading={false}
                    onCitationClick={handleCitationClick}
                    documents={documents.map(doc => ({id: doc.id, name: doc.name}))}
                    className="h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Click outside to close export menu */}
        {showExportMenu && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowExportMenu(false)}
          />
        )}

        {/* PdfViewer modal for citation highlight */}
        {highlight && clickedCitation && (
          <PdfViewer
            fileUrl={documents.find(doc => doc.id === clickedCitation.docId)?.fileUrl || ''}
            highlight={highlight}
            onClose={() => { setClickedCitation(null); setHighlight(null); }}
          />
        )}
      </div>
    );
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
        return renderViewReport();

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

  console.log('🎨 Rendering Comparison component');
  console.log('🎨 Current step in render:', currentStep);
  console.log('🎨 Comparison report length in render:', comparisonReport.length);
  console.log('🎨 Chat history length in render:', chatHistory.length);

  return (
    <div className={`flex-1 flex flex-col ${currentStep === 'view-report' ? 'w-full' : 'p-6 max-w-7xl mx-auto'} overflow-y-auto`}>
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