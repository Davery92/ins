import React, { useState, useEffect } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

// Import the styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

interface PdfDocumentViewerProps {
  document: {
    id: string;
    name: string;
    type: string;
    fileUrl?: string;
    file?: File;
  };
  onError?: (error: string) => void;
}

const PdfDocumentViewer: React.FC<PdfDocumentViewerProps> = ({
  document,
  onError
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const token = localStorage.getItem('riskninja-token') || '';

  // Create new plugin instance
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  useEffect(() => {
    const loadDocument = async () => {
      if (!document) return;

      setLoading(true);
      setError(null);

      try {
        let finalPdfUrl: string | null = null;

        // Strategy 1: Use the new streaming endpoint with blob fetch
        try {
          const streamUrl = `${API_BASE_URL}/documents/${document.id}/stream`;
          
          const response = await fetch(streamUrl, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('riskninja-token')}`
            }
          });
          
          if (response.ok) {
            const blob = await response.blob();
            finalPdfUrl = URL.createObjectURL(blob);
          }
        } catch (streamError) {
          // Silently continue to next strategy
        }

        // Strategy 2: Try to get fresh download URL if streaming failed
        if (!finalPdfUrl && document.fileUrl) {
          try {
            const response = await fetch(`${API_BASE_URL}/documents/${document.id}/download`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('riskninja-token')}`
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              // Fetch the PDF as blob using the download URL
              const pdfResponse = await fetch(data.downloadUrl);
              if (pdfResponse.ok) {
                const blob = await pdfResponse.blob();
                finalPdfUrl = URL.createObjectURL(blob);
              }
            }
          } catch (downloadError) {
            // Silently continue to next strategy
          }
        }

        // Strategy 3: Use existing fileUrl if available
        if (!finalPdfUrl && document.fileUrl) {
          try {
            const pdfResponse = await fetch(document.fileUrl);
            if (pdfResponse.ok) {
              const blob = await pdfResponse.blob();
              finalPdfUrl = URL.createObjectURL(blob);
            }
          } catch (error) {
            // Silently continue to next strategy
          }
        }

        // Strategy 4: Use local file object if available
        if (!finalPdfUrl && document.file) {
          finalPdfUrl = URL.createObjectURL(document.file);
        }

        if (finalPdfUrl) {
          setPdfUrl(finalPdfUrl);
        } else {
          throw new Error('No valid PDF source available');
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [document]);

  const handleDocumentLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleDocumentError = (error: any) => {
    setLoading(false);
    const errorMessage = `Failed to load PDF: ${error?.message || 'Unknown error'}`;
    setError(errorMessage);
    onError?.(errorMessage);
  };

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-red-500">
              <path d="M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2Z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-secondary dark:text-dark-text mb-2">
            No PDF Source Available
          </h3>
          <p className="text-accent dark:text-dark-muted">
            Neither file URL nor local file is available for viewing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-dark-surface bg-opacity-75 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-secondary dark:text-dark-text">Loading PDF...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-dark-surface z-10">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-red-500">
                <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-secondary dark:text-dark-text mb-2">
              PDF Loading Error
            </h3>
            <p className="text-accent dark:text-dark-muted text-sm mb-4">
              {error}
            </p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                // Trigger reload by clearing and resetting pdfUrl
                setPdfUrl(null);
                setTimeout(() => {
                  // This will trigger the useEffect again
                  const loadDocument = async () => {
                    // Repeat the loading logic here or extract to a separate function
                  };
                }, 100);
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="h-full">
        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
          <div className="h-full">
            <Viewer
              fileUrl={pdfUrl}
              plugins={[defaultLayoutPluginInstance]}
              onDocumentLoad={handleDocumentLoad}
            />
          </div>
        </Worker>
      </div>
    </div>
  );
};

export default PdfDocumentViewer; 