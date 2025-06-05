import React from 'react';
import { useDocuments } from '../contexts/DocumentContext';

interface RiskMetric {
  category: string;
  score: number;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

const Dashboard: React.FC = () => {
  const { documents, selectedPolicyType, chatHistory } = useDocuments();

  // Count saved report analyses from chat history
  const reportCount = chatHistory.filter(msg => msg.sender === 'ai').length;
  const totalDocs = documents.length;
  const avgRiskScore = documents.length > 0 
    ? Math.round(documents.filter(d => d.riskScore).reduce((sum, d) => sum + (d.riskScore || 0), 0) / documents.filter(d => d.riskScore).length)
    : 0;

  // Mock risk metrics for demonstration
  const riskMetrics: RiskMetric[] = [
    {
      category: 'Liability Coverage',
      score: 85,
      recommendation: 'Consider increasing aggregate limits to $3M for better protection',
      priority: 'medium'
    },
    {
      category: 'Cyber Security',
      score: 60,
      recommendation: 'Add cyber liability coverage minimum $1M for data breach protection',
      priority: 'high'
    },
    {
      category: 'Property Protection',
      score: 90,
      recommendation: 'Excellent coverage with replacement cost protection',
      priority: 'low'
    },
    {
      category: 'Business Interruption',
      score: 70,
      recommendation: 'Consider extending coverage period to 24 months',
      priority: 'medium'
    }
  ];

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white dark:bg-dark-surface border border-[#d0dee7] dark:border-dark-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-secondary dark:text-dark-text">
          Business Intelligence Dashboard
        </h2>
        <div className="text-sm text-accent dark:text-dark-muted">
          Policy Focus: {selectedPolicyType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </div>
      </div>

      {/* Overview Section */}
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalDocs}</div>
            <div className="text-sm text-blue-800 dark:text-blue-300">Policies Uploaded</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{reportCount}</div>
            <div className="text-sm text-green-800 dark:text-green-300">Analysis Complete</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4">
          <h3 className="font-semibold text-secondary dark:text-dark-text mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {documents.slice(0, 3).map((doc, index) => (
              <div key={doc.id} className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-secondary dark:text-dark-text">
                  {doc.name} uploaded
                </span>
                <span className="text-accent dark:text-dark-muted">
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {documents.length === 0 && (
              <div className="text-center text-accent dark:text-dark-muted py-4">
                No policies uploaded yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional dashboard sections removed: Risk Analysis, Policy Matrix, Analytics */}
    </div>
  );
};

export default Dashboard; 