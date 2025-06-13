import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
// Import chart detection utilities
import { detectTablesInMessage, detectChartElements, exportChart, ChartData } from '../utils/chartDetection';

// Regex to find citations in the format [CITATION:doc_id,page,start,end]
// Accepts optional 'doc_id:' or 'doc_id=' prefix, optional literal 'page,' and ignores any additional parameters
const citationRegex = /\[CITATION:\s*(?:doc_id[:=])?\s*([^,]+?)\s*,\s*(?:page\s*,\s*)?(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,.*)?\]/gi;
// Regex to find comparison citations in the format Citation: "text"
const comparisonCitationRegex = /Citation:\s*"([^"]+)"/g;
// Regex to find numbered citations [1], [2], [3], etc.
const numberedCitationRegex = /\[(\d+)\]/g;

export interface CitationClick {
  docId: string;
  page: number;
  start: number;
  end: number;
  index: number;
}

// Interface for span data used in citation mapping
interface SpanData {
  docId: string;
  pageNumber: number;
  startOffset: number;
  endOffset: number;
  text: string;
}

// Extract span data from AI response context (when spans were included in the prompt)
function extractSpansFromContext(text: string): SpanData[] {
  const spans: SpanData[] = [];
  const spanRegex = /\[CITATION:([^,]+),(\d+),(\d+),(\d+)\]\n([^\n]+)/g;
  let match;
  
  while ((match = spanRegex.exec(text)) !== null) {
    const [, docId, page, start, end, spanText] = match;
    spans.push({
      docId: docId.trim(),
      pageNumber: Number(page),
      startOffset: Number(start),
      endOffset: Number(end),
      text: spanText.trim()
    });
  }
  
  return spans;
}

// Enhanced chart export button component
const ChartExportButton: React.FC<{ chartData: ChartData; className?: string }> = ({ chartData, className = '' }) => {
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportChart(chartData, {
        filename: `${chartData.title?.replace(/[^a-z0-9]/gi, '_') || 'chart_data'}.xlsx`,
        includeData: true,
        includeImage: !!chartData.element
      });
    } catch (error) {
      console.error('Export failed:', error);
      // You could show a toast notification here
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`chart-export-button flex items-center gap-1 ${className}`}
      title="Export to Excel"
    >
      {isExporting ? (
        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
      )}
      Excel
    </button>
  );
};

// Enhanced content renderer with chart detection
function renderContentWithCitations(
  text: string,
  onCitationClick?: (c: CitationClick) => void,
  documents?: Array<{id: string, name: string}>,
  citationMap?: SpanData[] // Ordered list of spans for numbered citations
): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let count = 1;
  
  // Detect charts in the content
  const detectedCharts = detectTablesInMessage(text);
  
  // Find all citations and create citation data
  const citations: Array<{
    match: RegExpExecArray;
    citationData: CitationClick | null;
    type: 'standard' | 'comparison' | 'numbered';
  }> = [];
  
  // Find numbered citations [1], [2], [3], etc.
  let match: RegExpExecArray | null;
  const numberedRegex = new RegExp(numberedCitationRegex.source, numberedCitationRegex.flags);
  
  while ((match = numberedRegex.exec(text)) !== null) {
    const citationNumber = Number(match[1]);
    
    // Map numbered citation to span data (1-indexed)
    const spanIndex = citationNumber - 1;
    const spanData = citationMap?.[spanIndex];
    
    if (spanData) {
      citations.push({
        match,
        citationData: {
          docId: spanData.docId,
          page: spanData.pageNumber,
          start: spanData.startOffset,
          end: spanData.endOffset,
          index: citationNumber
        },
        type: 'numbered'
      });
    } else {
      // Fallback for numbered citations without span data
      citations.push({
        match,
        citationData: null,
        type: 'numbered'
      });
    }
  }
  
  // Find standard citations [CITATION:doc_id,page,start,end]
  const standardRegex = new RegExp(citationRegex.source, citationRegex.flags);
  
  while ((match = standardRegex.exec(text)) !== null) {
    const [, docIdOrName, page, start, end] = match;
    
    // Try to resolve document name to ID if documents array is provided
    let actualDocId = docIdOrName.trim();
    if (documents) {
      // Exact match first
      let foundDoc = documents.find(
        doc => doc.id === actualDocId || doc.name === actualDocId
      );
      if (!foundDoc) {
        // Fuzzy match on name fragments (strip non-alphanumerics)
        const key = actualDocId.replace(/\W/g, '').toLowerCase();
        foundDoc = documents.find(d => {
          const cleanName = d.name.replace(/\W/g, '').toLowerCase();
          return cleanName.includes(key) || key.includes(cleanName);
        });
      }
      if (foundDoc) {
        actualDocId = foundDoc.id;
      }
    }
    
    citations.push({
      match,
      citationData: {
        docId: actualDocId,
        page: Number(page),
        start: Number(start),
        end: Number(end),
        index: count
      },
      type: 'standard'
    });
    count++;
  }
  
  // Find comparison citations Citation: "text"
  const comparisonRegex = new RegExp(comparisonCitationRegex.source, comparisonCitationRegex.flags);
  
  while ((match = comparisonRegex.exec(text)) !== null) {
    citations.push({
      match,
      citationData: null, // No specific location data for comparison citations
      type: 'comparison'
    });
    count++;
  }
  
  // Sort citations by their position in the text
  citations.sort((a, b) => a.match.index! - b.match.index!);
  
  // Now render the content with citations
  count = 1;
  for (const { match, citationData, type } of citations) {
    const idx = match.index!;
    const full = match[0];
    
    // Add preceding text
    if (idx > lastIndex) {
      const contentPart = text.slice(lastIndex, idx);
      parts.push(
        <div key={`text-${lastIndex}-${idx}`} className="chart-container">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]} 
            rehypePlugins={[rehypeHighlight, rehypeKatex]}
          >
            {contentPart}
          </ReactMarkdown>
          {/* Add chart export buttons for detected charts in this content section */}
          {detectedCharts.map((chart, chartIndex) => (
            <ChartExportButton key={`chart-${chartIndex}`} chartData={chart} />
          ))}
        </div>
      );
    }
    
    // Add clickable citation
    if ((type === 'standard' || type === 'numbered') && citationData && onCitationClick) {
      const displayNumber = type === 'numbered' ? citationData.index : count;
      parts.push(
        <button
          key={`citation-${count}`}
          className="text-primary underline hover:text-blue-600 transition-colors mx-1 px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30"
          onClick={() => onCitationClick(citationData)}
        >
          [{displayNumber}]
        </button>
      );
    } else {
      // For comparison citations or when no click handler, just show as text
      const displayNumber = type === 'numbered' ? Number(match[1]) : count;
      parts.push(
        <span
          key={`citation-${count}`}
          className="text-primary font-medium mx-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30"
        >
          [{displayNumber}]
        </span>
      );
    }
    
    lastIndex = idx + full.length;
    if (type !== 'numbered') count++;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    const remainingContent = text.slice(lastIndex);
    parts.push(
      <div key={`text-${lastIndex}-end`} className="chart-container">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]} 
          rehypePlugins={[rehypeHighlight, rehypeKatex]}
        >
          {remainingContent}
        </ReactMarkdown>
        {/* Add chart export buttons for any remaining charts */}
        {detectedCharts.map((chart, chartIndex) => (
          <ChartExportButton key={`remaining-chart-${chartIndex}`} chartData={chart} />
        ))}
      </div>
    );
  }
  
  return <div className="space-y-4">{parts}</div>;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatInterfaceProps {
  onSendMessage: (message: string) => void;
  messages: ChatMessage[];
  isLoading?: boolean;
  onCitationClick?: (c: CitationClick) => void;
  className?: string;
  documents?: Array<{id: string, name: string}>;
  citationMap?: SpanData[]; // Ordered list of spans corresponding to [1], [2], [3], etc.
  onClearChat?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onSendMessage,
  messages,
  isLoading = false,
  className = '',
  onCitationClick,
  documents,
  citationMap,
  onClearChat
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [detectedCharts, setDetectedCharts] = useState<ChartData[]>([]);
  const [isOverlayMode, setIsOverlayMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Auto-scroll to bottom when new messages arrive, but keep chat in view
  useEffect(() => {
    if (messagesEndRef.current && !isOverlayMode) {
      // Scroll the chat container, not the entire page
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [messages, isOverlayMode]);

  // Detect charts when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      const charts = detectChartElements(messagesContainerRef.current);
      setDetectedCharts(charts);
    }
  }, [messages]);

  // Handle overlay mode
  const toggleOverlayMode = () => {
    setIsOverlayMode(!isOverlayMode);
  };

  // Handle click outside overlay to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOverlayMode(false);
    }
  };

  // Calculate dynamic height based on content - taller aspect ratio
  const calculateChatHeight = () => {
    if (isOverlayMode) return 'h-[85vh]';
    
    const messageCount = messages.length;
    if (messageCount === 0) return 'h-[500px]';
    if (messageCount <= 3) return 'h-[600px]';
    if (messageCount <= 6) return 'h-[700px]';
    if (messageCount <= 10) return 'h-[800px]';
    return 'h-[900px]';
  };

  // Handle clear chat
  const handleClearChat = () => {
    if (onClearChat && messages.length > 0) {
      if (window.confirm('Are you sure you want to clear this chat? This action cannot be undone.')) {
        onClearChat();
      }
    }
  };

  const handleSendMessage = () => {
    if (inputMessage.trim() && !isLoading) {
      onSendMessage(inputMessage.trim());
      setInputMessage('');
      
      // Focus back to input after sending
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Copy text to clipboard with fallback for insecure contexts
  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => console.log('Copied to clipboard'))
        .catch(err => console.error('Clipboard write failed', err));
    } else {
      // Fallback for older browsers or insecure contexts
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
        console.log('Copied to clipboard (fallback)');
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textarea);
    }
  };

  const chatContent = (
    <div 
      ref={chatContainerRef}
      className={`flex flex-col bg-white dark:bg-dark-surface rounded-xl shadow-lg border border-gray-200 dark:border-dark-border canvas-like-chat ${calculateChatHeight()} ${
        isOverlayMode ? 'w-[90vw] max-w-6xl' : 'w-full'
      }`}
    >
      {/* Header with overlay toggle and clear buttons */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-surface rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-secondary dark:text-dark-text">RiskNinja AI</span>
          {messages.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Clear Chat Button */}
          {onClearChat && messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Clear chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"/>
              </svg>
            </button>
          )}
          
          {/* Expand/Minimize Button */}
          <button
            onClick={toggleOverlayMode}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={isOverlayMode ? "Minimize chat" : "Expand chat"}
          >
            {isOverlayMode ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Messages Area - Gemini Canvas Style */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-8 space-y-8 bg-gradient-to-br from-slate-50/80 via-white to-slate-50/60 dark:from-slate-900/80 dark:via-slate-800 dark:to-slate-900/60 backdrop-blur-sm chat-messages-container"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-primary">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 8H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M17 12H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-secondary dark:text-dark-text mb-3">
              Welcome to RiskNinja AI
            </h3>
            <p className="text-accent dark:text-dark-muted text-lg max-w-2xl leading-relaxed">
              {user 
                ? 'I\'m here to help you analyze policies, assess risks, and optimize your insurance coverage. Upload documents or ask me anything about commercial insurance.'
                : 'Sign in to unlock powerful AI-driven insurance analysis and risk assessment tools.'
              }
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-500`}
              >
                <div
                  className={`max-w-4xl rounded-2xl px-6 py-4 shadow-sm ${
                    message.sender === 'user'
                      ? 'chat-message-user'
                      : 'chat-message-ai border border-gray-200/50 dark:border-gray-700/50'
                  }`}
                >
                  {message.sender === 'ai' && (
                    <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-200/30 dark:border-gray-700/30">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-primary dark:text-blue-400">RiskNinja AI</span>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className={`text-base leading-relaxed ${message.sender === 'user' ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                    <div className="overflow-x-auto markdown-content prose prose-lg max-w-none dark:prose-invert">
                      {renderContentWithCitations(message.content, onCitationClick, documents, citationMap)}
                    </div>
                    {message.isStreaming && (
                      <span className="inline-block w-1 h-6 bg-current ml-2 animate-pulse rounded-full"></span>
                    )}
                  </div>
                  {message.sender === 'user' && (
                    <div className="flex items-center justify-end mt-2 text-xs text-blue-100">
                      <span>{formatTime(message.timestamp)}</span>
                    </div>
                  )}
                  {message.sender === 'ai' && !message.isStreaming && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200/30 dark:border-gray-700/30">
                      <div className="flex items-center gap-2">
                        {detectedCharts.length > 0 && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3 3v18h18v-2H5V3H3zm4 14h2V9H7v8zm4 0h2v-6h-2v6zm4 0h2V7h-2v10z"/>
                            </svg>
                            {detectedCharts.length} chart{detectedCharts.length !== 1 ? 's' : ''} detected
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => copyToClipboard(message.content)}
                        className="flex items-center gap-1 px-3 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all"
                        title="Copy response"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area - Enhanced Gemini Style */}
      <div className="p-6 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50 rounded-b-xl">
        {user ? (
          <>
            <div className="flex items-end gap-4 max-w-6xl mx-auto">
              <div className="flex-1">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about policies, risks, coverage gaps, or premium optimization..."
                    disabled={isLoading}
                    className="w-full px-6 py-4 bg-white dark:bg-gray-800 border border-gray-300/50 dark:border-gray-600/50 rounded-2xl text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all duration-200 disabled:opacity-50 shadow-sm text-base"
                  />
                  {isLoading && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-700 text-white rounded-2xl font-medium transition-all duration-200 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22,2 15,22 11,13 2,9"></polygon>
                    </svg>
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Enhanced Quick Actions */}
            <div className="flex flex-wrap gap-3 mt-6 max-w-6xl mx-auto">
              <button
                onClick={() => setInputMessage("Compare coverage limits across my policies")}
                className="px-4 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md"
              >
                💼 Compare Coverage
              </button>
              <button
                onClick={() => setInputMessage("Identify potential risk exposures in my business")}
                className="px-4 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md"
              >
                ⚠️ Risk Assessment
              </button>
              <button
                onClick={() => setInputMessage("Find opportunities to reduce insurance costs")}
                className="px-4 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md"
              >
                💰 Cost Optimization
              </button>
              <button
                onClick={() => setInputMessage("Analyze my premium trends and projections")}
                className="px-4 py-2 text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md"
              >
                📊 Premium Analysis
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 max-w-md mx-auto">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-secondary dark:text-dark-text mb-2">
                Sign in to get started
              </h4>
              <p className="text-sm text-accent dark:text-dark-muted leading-relaxed">
                Unlock AI-powered insurance analysis, risk assessment, and policy optimization tools.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isOverlayMode) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={handleOverlayClick}
      >
        {chatContent}
      </div>
    );
  }

  return (
    <div className={className}>
      {chatContent}
    </div>
  );
};

export default ChatInterface; 