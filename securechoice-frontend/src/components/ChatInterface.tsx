import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  className?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onSendMessage,
  messages,
  isLoading = false,
  className = ''
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
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                    {message.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse"></span>
                    )}
                  </div>
                  <div className={`text-xs mt-1 ${
                    message.sender === 'user' 
                      ? 'text-blue-100' 
                      : 'text-accent dark:text-dark-muted'
                  }`}>
                    {formatTime(message.timestamp)}
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