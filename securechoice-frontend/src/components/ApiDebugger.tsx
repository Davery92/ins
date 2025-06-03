import React, { useState } from 'react';
import { aiService } from '../services/aiService';
import { config, validateConfig } from '../utils/config';

const ApiDebugger: React.FC = () => {
  const [testMessage, setTestMessage] = useState('Hello, can you help me with insurance?');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testApiCall = async () => {
    setIsLoading(true);
    setResponse('');
    setLogs([]);
    
    addLog('Starting API test...');
    
    try {
      const result = await aiService.sendMessage(testMessage, (chunk) => {
        setResponse(chunk);
        addLog(`Streaming update: ${chunk.length} characters`);
      });
      
      addLog(`Final response: ${result.length} characters`);
      setResponse(result);
      
    } catch (error) {
      addLog(`Error: ${error}`);
      setResponse('Error occurred during API call');
    } finally {
      setIsLoading(false);
    }
  };

  const configValidation = validateConfig();

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-dark-bg rounded-lg border border-[#d0dee7] dark:border-dark-border">
      <h2 className="text-xl font-bold text-secondary dark:text-dark-text mb-6">
        🔧 API Debugger
      </h2>
      
      {/* Configuration Status */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-secondary dark:text-dark-text mb-3">
          Configuration Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-dark-surface rounded-lg">
            <h4 className="font-medium text-secondary dark:text-dark-text mb-2">Environment</h4>
            <ul className="text-sm space-y-1">
              <li className="text-accent dark:text-dark-muted">
                <span className="font-medium">NODE_ENV:</span> {process.env.NODE_ENV}
              </li>
              <li className="text-accent dark:text-dark-muted">
                <span className="font-medium">App Name:</span> {config.app.name}
              </li>
              <li className="text-accent dark:text-dark-muted">
                <span className="font-medium">Version:</span> {config.app.version}
              </li>
            </ul>
          </div>
          
          <div className="p-4 bg-slate-50 dark:bg-dark-surface rounded-lg">
            <h4 className="font-medium text-secondary dark:text-dark-text mb-2">API Configuration</h4>
            <ul className="text-sm space-y-1">
              <li className="text-accent dark:text-dark-muted">
                <span className="font-medium">Model:</span> {config.gemini.modelId}
              </li>
              <li className="text-accent dark:text-dark-muted">
                <span className="font-medium">API Key:</span> {config.gemini.apiKey ? '✅ Set' : '❌ Missing'}
              </li>
              <li className={`text-sm ${configValidation.isValid ? 'text-success' : 'text-error'}`}>
                <span className="font-medium">Status:</span> {configValidation.isValid ? '✅ Valid' : '❌ Invalid'}
              </li>
            </ul>
          </div>
        </div>
        
        {!configValidation.isValid && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Configuration Issues:</h4>
            <ul className="text-sm text-red-600 dark:text-red-300 space-y-1">
              {configValidation.errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* API Test */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-secondary dark:text-dark-text mb-3">
          API Test
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary dark:text-dark-text mb-2">
              Test Message:
            </label>
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full px-3 py-2 border border-[#d0dee7] dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-secondary dark:text-dark-text"
              placeholder="Enter a test message..."
            />
          </div>
          
          <button
            onClick={testApiCall}
            disabled={isLoading || !configValidation.isValid}
            className="px-4 py-2 bg-primary hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
          >
            {isLoading ? 'Testing...' : 'Test API Call'}
          </button>
        </div>
      </div>

      {/* Response */}
      {response && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-secondary dark:text-dark-text mb-3">
            API Response
          </h3>
          <div className="p-4 bg-slate-50 dark:bg-dark-surface rounded-lg border border-[#d0dee7] dark:border-dark-border">
            <pre className="text-sm text-secondary dark:text-dark-text whitespace-pre-wrap break-words">
              {response}
            </pre>
          </div>
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-secondary dark:text-dark-text mb-3">
            Debug Logs
          </h3>
          <div className="p-4 bg-slate-50 dark:bg-dark-surface rounded-lg border border-[#d0dee7] dark:border-dark-border max-h-60 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="text-xs text-accent dark:text-dark-muted font-mono mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiDebugger; 