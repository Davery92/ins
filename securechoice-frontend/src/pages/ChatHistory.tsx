import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  context?: {
    policyType?: string;
    documentCount?: number;
    documentNames?: string[];
  };
}

interface ChatStats {
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  lastActivity: string | null;
}

const ChatHistory: React.FC = () => {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSender, setFilterSender] = useState<'all' | 'user' | 'ai'>('all');
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (token) {
      fetchChatHistory();
      fetchChatStats();
    }
  }, [token]);

  const fetchChatHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }

      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChatStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chat stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch chat stats:', error);
    }
  };

  const clearChatHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/chat/history`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to clear chat history');
      }

      setMessages([]);
      setStats(null);
      fetchChatStats();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to clear chat history');
    }
  };

  const exportChatHistory = () => {
    const exportData = messages.map(msg => ({
      timestamp: new Date(msg.timestamp).toLocaleString(),
      sender: msg.sender,
      content: msg.content,
      context: msg.context,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `riskninja-chat-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSender = filterSender === 'all' || message.sender === filterSender;
    return matchesSearch && matchesSender;
  });

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-secondary dark:text-dark-text mb-2">
            Please Sign In
          </h2>
          <p className="text-accent dark:text-dark-muted">
            You need to be signed in to view your chat history.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary dark:text-dark-text mb-2">
          Chat History
        </h1>
        <p className="text-accent dark:text-dark-muted">
          View and manage your conversation history with RiskNinja AI
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-dark-surface rounded-lg p-4 border border-gray-200 dark:border-dark-border">
            <div className="text-2xl font-bold text-primary">{stats.totalMessages}</div>
            <div className="text-sm text-accent dark:text-dark-muted">Total Messages</div>
          </div>
          <div className="bg-white dark:bg-dark-surface rounded-lg p-4 border border-gray-200 dark:border-dark-border">
            <div className="text-2xl font-bold text-green-600">{stats.userMessages}</div>
            <div className="text-sm text-accent dark:text-dark-muted">Your Messages</div>
          </div>
          <div className="bg-white dark:bg-dark-surface rounded-lg p-4 border border-gray-200 dark:border-dark-border">
            <div className="text-2xl font-bold text-blue-600">{stats.aiMessages}</div>
            <div className="text-sm text-accent dark:text-dark-muted">AI Responses</div>
          </div>
          <div className="bg-white dark:bg-dark-surface rounded-lg p-4 border border-gray-200 dark:border-dark-border">
            <div className="text-sm font-medium text-secondary dark:text-dark-text">
              {stats.lastActivity ? formatTimestamp(stats.lastActivity) : 'No activity'}
            </div>
            <div className="text-sm text-accent dark:text-dark-muted">Last Activity</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white dark:bg-dark-surface rounded-lg p-4 border border-gray-200 dark:border-dark-border mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-dark-bg text-secondary dark:text-dark-text"
            />
            <select
              value={filterSender}
              onChange={(e) => setFilterSender(e.target.value as 'all' | 'user' | 'ai')}
              className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-dark-bg text-secondary dark:text-dark-text"
            >
              <option value="all">All Messages</option>
              <option value="user">Your Messages</option>
              <option value="ai">AI Responses</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportChatHistory}
              disabled={messages.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              Export
            </button>
            <button
              onClick={clearChatHistory}
              disabled={messages.length === 0}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border flex-1">
        {filteredMessages.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-accent dark:text-dark-muted mb-2">
              {messages.length === 0 ? 'No chat history yet' : 'No messages match your search'}
            </div>
            <p className="text-sm text-accent dark:text-dark-muted">
              {messages.length === 0 
                ? 'Start a conversation on the Home page to see your chat history here.'
                : 'Try adjusting your search terms or filters.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-dark-border">
            {filteredMessages.map((message) => (
              <div key={message.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                    message.sender === 'user' ? 'bg-green-600' : 'bg-primary'
                  }`}>
                    {message.sender === 'user' ? (user?.firstName?.[0] || 'U') : 'AI'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-secondary dark:text-dark-text">
                        {message.sender === 'user' ? `${user?.firstName} ${user?.lastName}` : 'RiskNinja AI'}
                      </span>
                      <span className="text-xs text-accent dark:text-dark-muted">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <div className="text-secondary dark:text-dark-text whitespace-pre-wrap">
                      {message.content}
                    </div>
                    {message.context && (
                      <div className="mt-2 text-xs text-accent dark:text-dark-muted">
                        {message.context.policyType && (
                          <span className="inline-block bg-gray-100 dark:bg-dark-bg px-2 py-1 rounded mr-2">
                            Policy: {message.context.policyType}
                          </span>
                        )}
                        {message.context.documentCount && (
                          <span className="inline-block bg-gray-100 dark:bg-dark-bg px-2 py-1 rounded">
                            {message.context.documentCount} document(s)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHistory; 