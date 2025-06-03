import React, { useState, useEffect } from 'react';
import { aiService } from '../services/aiService';

const ApiStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const testConnection = async () => {
      setIsLoading(true);
      try {
        const connected = await aiService.testConnection();
        setIsConnected(connected);
      } catch (error) {
        console.error('Connection test error:', error);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    testConnection();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-accent dark:text-dark-muted">
        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
        <span>Testing AI connection...</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 text-xs text-success">
        <div className="w-2 h-2 bg-success rounded-full"></div>
        <span>AI Assistant Ready</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-accent dark:text-dark-muted">
      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
      <span>Using offline mode</span>
    </div>
  );
};

export default ApiStatus; 