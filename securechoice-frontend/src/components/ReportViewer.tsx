import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface UnderwritingReport {
  id: string;
  userId: string;
  customerId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ReportViewerProps {
  report: UnderwritingReport;
  customerName?: string;
  onClose: () => void;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ report, customerName, onClose }) => {
  const handleExportReport = () => {
    const content = `${report.title}\n${'='.repeat(report.title.length)}\n\nGenerated: ${new Date(report.createdAt).toLocaleString()}\nCustomer: ${customerName || 'Unknown'}\n\n${report.content}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
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
                {report.title}
              </h3>
              <p className="text-sm text-accent dark:text-dark-muted">
                Report • Created {new Date(report.createdAt).toLocaleDateString()}
                {customerName && ` • ${customerName}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              className="text-sm leading-relaxed"
            >
              {report.content}
            </ReactMarkdown>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-dark-border">
          <div className="text-sm text-accent dark:text-dark-muted">
            Generated: {new Date(report.createdAt).toLocaleDateString()} • 
            Updated: {new Date(report.updatedAt).toLocaleDateString()}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportReport}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-secondary dark:text-dark-text text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              📥 Export Report
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportViewer; 