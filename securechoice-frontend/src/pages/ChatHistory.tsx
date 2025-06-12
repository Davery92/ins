import React, { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';
import FileUploader, { UploadedFile } from '../components/FileUploader';

interface ResearchReport {
  success: boolean;
  report: string;
  metadata: {
    pagesAnalyzed: number;
    pageTypes: string[];
    documentCount: number;
    companyUrl: string;
  };
}

const Research: React.FC = () => {
  const { token } = useAuth();
  const location = useLocation();
  const customerId = (location.state as any)?.customerId;
  const [url, setUrl] = useState('');
  const [additionalText, setAdditionalText] = useState('');
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

  const handleFilesUploaded = (newFiles: UploadedFile[]) => {
    setUploadedDocuments(prev => [...prev, ...newFiles]);
  };

  const removeDocument = (index: number) => {
    setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const generateResearch = async () => {
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setReport(null);

    try {
      // Process uploaded documents to extract text
      const processedDocuments = await Promise.all(
        uploadedDocuments.map(async (doc) => {
          if (doc.file) {
            // For now, we'll just use the file name and basic info
            // In a production system, you'd want to extract text from the file
            return {
              name: doc.name,
              content: `Document: ${doc.name} (${(doc.size / 1024).toFixed(1)} KB, ${doc.type})`,
              type: doc.file.type
            };
          }
          return {
            name: doc.name,
            content: `Document: ${doc.name}`,
            type: doc.type
          };
        })
      );

      const requestBody = {
        url: url.trim(),
        additionalText: additionalText.trim(),
        documents: processedDocuments
      };

      console.log('Sending research request:', requestBody);

      const response = await fetch(`${API_BASE_URL}/research/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate research report');
      }

      const result = await response.json();
      setReport(result);

      // Save report under customer if provided
      if (customerId) {
        try {
          const saveResponse = await fetch(
            `${API_BASE_URL}/customers/${customerId}/underwriting-reports`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                title: `Underwriting Research Report - ${new Date().toLocaleDateString()}`,
                content: result.report
              })
            }
          );
          if (!saveResponse.ok) {
            console.error('Failed to save underwriting report');
          }
        } catch (err) {
          console.error('Error saving underwriting report:', err);
        }
      }

    } catch (err) {
      console.error('Research generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate research report');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToPDF = () => {
    if (!report || !reportRef.current) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const reportContent = reportRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Underwriting Research Report</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              margin: 20px; 
              color: #333;
            }
            h1, h2, h3 { color: #2563eb; }
            h1 { border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
            ul, ol { margin: 10px 0; padding-left: 30px; }
            p { margin: 10px 0; }
            pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
            blockquote { 
              border-left: 4px solid #2563eb; 
              margin: 10px 0; 
              padding-left: 15px; 
              background: #f8f9fa;
            }
            @media print {
              body { margin: 0; }
              h1 { page-break-before: avoid; }
              h2, h3 { page-break-after: avoid; }
            }
            
            /* Table styles */
            table {
              border-collapse: collapse;
              margin: 1rem 0;
              width: 100%;
            }
            table th, table td {
              border: 1px solid #e2e8f0;
              padding: 0.5rem 0.75rem;
              text-align: left;
            }
            table th {
              background-color: #f8fafc;
              font-weight: 600;
            }
            
            /* Code block styles */
            pre {
              background-color: #f8fafc;
              border-radius: 0.375rem;
              padding: 1rem;
              overflow-x: auto;
            }
            code {
              font-family: monospace;
              font-size: 0.9em;
              padding: 0.2em 0.4em;
              border-radius: 0.25rem;
              background-color: rgba(0, 0, 0, 0.05);
            }
            
            /* Math expression styles */
            .katex-display {
              overflow-x: auto;
              overflow-y: hidden;
              padding: 0.5rem 0;
            }
            .katex {
              font-size: 1.1em;
            }
          </style>
          
          <!-- Include highlight.js styles -->
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css">
          
          <!-- Include KaTeX styles -->
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/katex.min.css">
        </head>
        <body>
          ${reportContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait a moment for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-secondary dark:text-dark-text mb-2">
            Please Sign In
          </h2>
          <p className="text-accent dark:text-dark-muted">
            You need to be signed in to use the research feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary dark:text-dark-text mb-2">
          Underwriting Research
        </h1>
        <p className="text-accent dark:text-dark-muted">
          Generate comprehensive underwriting analysis by researching company websites, adding context, and uploading supporting documents.
        </p>
      </div>

      {/* Research Form */}
      <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-secondary dark:text-dark-text mb-4">
          Research Parameters
        </h2>

        {/* URL Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-secondary dark:text-dark-text mb-2">
            Company Website URL *
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://company.com"
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-secondary dark:text-dark-text placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isGenerating}
          />
          <p className="text-xs text-accent dark:text-dark-muted mt-1">
            The system will automatically find and analyze the home, about, services, and contact pages.
          </p>
        </div>

        {/* Additional Text */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-secondary dark:text-dark-text mb-2">
            Additional Context
          </label>
          <textarea
            value={additionalText}
            onChange={(e) => setAdditionalText(e.target.value)}
            placeholder="Enter any additional information about the company, specific concerns, or context that would help with the underwriting analysis..."
            rows={4}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-secondary dark:text-dark-text placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            disabled={isGenerating}
          />
        </div>

        {/* Document Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-secondary dark:text-dark-text mb-2">
            Supporting Documents
          </label>
          <FileUploader
            onFilesUploaded={handleFilesUploaded}
            disabled={isGenerating}
            maxFiles={5}
            acceptedTypes={['.pdf', '.doc', '.docx', '.txt']}
          />
          
          {/* Uploaded Documents List */}
          {uploadedDocuments.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-secondary dark:text-dark-text">Uploaded Documents:</p>
              {uploadedDocuments.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-500">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                    <span className="text-sm text-secondary dark:text-dark-text">{doc.name}</span>
                    <span className="text-xs text-accent dark:text-dark-muted">
                      ({(doc.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={() => removeDocument(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                    disabled={isGenerating}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={generateResearch}
          disabled={isGenerating || !url.trim()}
          className="w-full bg-primary hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generating Research Report...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
              </svg>
              Generate Underwriting Research
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-red-600">
              <path d="M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2Z" />
            </svg>
            <span className="text-red-700 dark:text-red-400 font-medium">Error</span>
          </div>
          <p className="text-red-700 dark:text-red-400 mt-1">{error}</p>
        </div>
      )}

      {/* Research Report Display */}
      {report && (
        <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden dark:text-white">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-secondary dark:text-dark-text">
                Research Report
              </h2>
              <p className="text-sm text-accent dark:text-dark-muted">
                Analyzed {report.metadata.pagesAnalyzed} pages • {report.metadata.documentCount} documents
              </p>
            </div>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              </svg>
              Export PDF
            </button>
          </div>
          
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <div ref={reportRef} className="prose prose-sm max-w-none dark:prose-invert dark:text-white markdown-content">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight, rehypeKatex]}
                className="overflow-x-auto"
              >
                {report.report}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Research; 