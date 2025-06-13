import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';

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

// Render content with clickable citations
function renderContentWithCitations(
  text: string,
  onCitationClick?: (c: CitationClick) => void,
  documents?: Array<{id: string, name: string}>,
  citationMap?: SpanData[] // Ordered list of spans for numbered citations
): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let count = 1;
  
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
      parts.push(
        <ReactMarkdown 
          key={`text-${lastIndex}-${idx}`}
          remarkPlugins={[remarkGfm]} 
          rehypePlugins={[rehypeHighlight, rehypeKatex]}
        >
          {text.slice(lastIndex, idx)}
        </ReactMarkdown>
      );
    }
    
    // Add clickable citation
    if ((type === 'standard' || type === 'numbered') && citationData && onCitationClick) {
      const displayNumber = type === 'numbered' ? citationData.index : count;
      parts.push(
        <button
          key={`citation-${count}`}
          className="text-primary underline hover:text-blue-600 transition-colors mx-1"
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
          className="text-primary font-medium mx-1"
        >
          [{displayNumber}]
        </span>
      );
    }
    
    // Only increment count for non-numbered citations
    if (type !== 'numbered') {
      count++;
    }
    lastIndex = idx + full.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <ReactMarkdown 
        key={`text-${lastIndex}-end`}
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
      >
        {text.slice(lastIndex)}
      </ReactMarkdown>
    );
  }
  
  return <>{parts}</>;
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
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onSendMessage,
  messages,
  isLoading = false,
  className = '',
  onCitationClick,
  documents,
  citationMap
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (inputMessage.trim() && !isLoading && user) {
      onSendMessage(inputMessage.trim());
      setInputMessage('');
      inputRef.current?.focus();
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

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-dark-bg border border-[#d0dee7] dark:border-dark-border rounded-t-lg">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-primary">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 8H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M17 12H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-secondary dark:text-dark-text mb-2">
              Start a conversation with RiskNinja AI
            </h3>
            <p className="text-accent dark:text-dark-muted text-sm max-w-md">
              {user 
                ? 'Ask me about policy coverage, risk assessments, premium comparisons, or upload documents for analysis.'
                : 'Please sign in to start chatting with RiskNinja AI and analyze your commercial insurance policies.'
              }
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-dark-surface text-secondary dark:text-dark-text'
                  }`}
                >
                  {message.sender === 'ai' && (
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-primary dark:text-primary">RiskNinja AI</span>
                    </div>
                  )}
                  <div className="text-sm leading-relaxed">
                    <div className="overflow-x-auto markdown-content">
                      {renderContentWithCitations(message.content, onCitationClick, documents, citationMap)}
                    </div>
                    {message.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse"></span>
                    )}
                  </div>
                  <div className={`flex items-center mt-1 text-xs ${
                    message.sender === 'user' 
                      ? 'text-blue-100' 
                      : 'text-accent dark:text-dark-muted'
                  }`}>
                    <span>{formatTime(message.timestamp)}</span>
                    {message.sender === 'ai' && !message.isStreaming && (
                      <button
                        onClick={() => copyToClipboard(message.content)}
                        className="ml-2 p-1 hover:text-primary"
                        title="Copy response"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-50 dark:bg-dark-surface border-t border-[#d0dee7] dark:border-dark-border rounded-b-lg">
        {user ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about policy coverage, premiums, or risk factors..."
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-white dark:bg-dark-bg border border-[#d0dee7] dark:border-dark-border rounded-lg text-secondary dark:text-dark-text placeholder:text-accent dark:placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 disabled:opacity-50"
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="px-6 py-3 bg-primary hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22,2 15,22 11,13 2,9"></polygon>
                    </svg>
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => setInputMessage("Compare my uploaded policies")}
                className="px-3 py-1 text-xs bg-white dark:bg-dark-bg border border-[#d0dee7] dark:border-dark-border text-accent dark:text-dark-muted rounded-full hover:border-primary hover:text-primary transition-colors"
              >
                Compare Policies
              </button>
              <button
                onClick={() => setInputMessage("What are my biggest risk factors?")}
                className="px-3 py-1 text-xs bg-white dark:bg-dark-bg border border-[#d0dee7] dark:border-dark-border text-accent dark:text-dark-muted rounded-full hover:border-primary hover:text-primary transition-colors"
              >
                Risk Assessment
              </button>
              <button
                onClick={() => setInputMessage("Show me potential savings opportunities")}
                className="px-3 py-1 text-xs bg-white dark:bg-dark-bg border border-[#d0dee7] dark:border-dark-border text-accent dark:text-dark-muted rounded-full hover:border-primary hover:text-primary transition-colors"
              >
                Find Savings
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="mb-3">
              <svg className="w-8 h-8 text-accent dark:text-dark-muted mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <h4 className="text-sm font-medium text-secondary dark:text-dark-text mb-1">
                Sign in required
              </h4>
              <p className="text-xs text-accent dark:text-dark-muted">
                Please sign in to chat with RiskNinja AI and analyze your commercial insurance policies.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface; 