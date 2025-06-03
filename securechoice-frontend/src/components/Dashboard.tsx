import React, { useState } from 'react';
import { useDocuments } from '../contexts/DocumentContext';

interface RiskMetric {
  category: string;
  score: number;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

const Dashboard: React.FC = () => {
  const { documents, selectedPolicyType } = useDocuments();
  const [activeTab, setActiveTab] = useState<'overview' | 'comparison' | 'risks' | 'analytics'>('overview');
  // Fixed premium estimate, will not change on every render
  const [estimatedPremium] = useState<number>(() => Math.floor(Math.random() * 5000 + 10000));

  const completedDocs = documents.filter(doc => doc.status === 'completed');
  const totalDocs = documents.length;
  const avgRiskScore = completedDocs.length > 0 
    ? Math.round(completedDocs.filter(d => d.riskScore).reduce((sum, d) => sum + (d.riskScore || 0), 0) / completedDocs.filter(d => d.riskScore).length)
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

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-dark-bg rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'comparison', label: 'Policy Matrix' },
          { id: 'risks', label: 'Risk Analysis' },
          { id: 'analytics', label: 'Analytics' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-dark-surface text-primary shadow-sm'
                : 'text-accent dark:text-dark-muted hover:text-secondary dark:hover:text-dark-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalDocs}</div>
              <div className="text-sm text-blue-800 dark:text-blue-300">Policies Uploaded</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completedDocs.length}</div>
              <div className="text-sm text-green-800 dark:text-green-300">Analysis Complete</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                ${estimatedPremium.toLocaleString()}
              </div>
              <div className="text-sm text-purple-800 dark:text-purple-300">Est. Annual Premium</div>
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
      )}

      {/* Risk Analysis Tab */}
      {activeTab === 'risks' && (
        <div className="space-y-6">
          <div className="grid gap-4">
            {riskMetrics.map((metric, index) => (
              <div key={index} className="border border-gray-200 dark:border-dark-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-secondary dark:text-dark-text">{metric.category}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(metric.priority)}`}>
                      {metric.priority.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-sm font-bold ${getRiskColor(metric.score)}`}>
                      {metric.score}/100
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full ${
                      metric.score >= 80 ? 'bg-green-500' :
                      metric.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${metric.score}%` }}
                  />
                </div>
                <p className="text-sm text-accent dark:text-dark-muted">{metric.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Policy Comparison Matrix Tab */}
      {activeTab === 'comparison' && (
        <div className="space-y-4">
          {documents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 dark:border-dark-border">
                <thead>
                  <tr className="bg-gray-50 dark:bg-dark-bg">
                    <th className="border border-gray-200 dark:border-dark-border p-3 text-left text-sm font-medium text-secondary dark:text-dark-text">
                      Document
                    </th>
                    <th className="border border-gray-200 dark:border-dark-border p-3 text-left text-sm font-medium text-secondary dark:text-dark-text">
                      Status
                    </th>
                    <th className="border border-gray-200 dark:border-dark-border p-3 text-left text-sm font-medium text-secondary dark:text-dark-text">
                      Risk Score
                    </th>
                    <th className="border border-gray-200 dark:border-dark-border p-3 text-left text-sm font-medium text-secondary dark:text-dark-text">
                      Key Insights
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="border border-gray-200 dark:border-dark-border p-3 text-sm text-secondary dark:text-dark-text">
                        {doc.name}
                      </td>
                      <td className="border border-gray-200 dark:border-dark-border p-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          doc.status === 'completed' ? 'bg-green-100 text-green-800' :
                          doc.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          doc.status === 'error' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.status || 'uploaded'}
                        </span>
                      </td>
                      <td className="border border-gray-200 dark:border-dark-border p-3 text-sm">
                        {doc.riskScore ? (
                          <span className={`font-medium ${
                            doc.riskScore >= 80 ? 'text-green-600' :
                            doc.riskScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {doc.riskScore}/100
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="border border-gray-200 dark:border-dark-border p-3 text-sm text-accent dark:text-dark-muted">
                        {doc.insights && doc.insights.length > 0 
                          ? doc.insights[0]
                          : 'Analysis pending'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-accent dark:text-dark-muted">
                Upload policy documents to see comparison matrix
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coverage Distribution */}
            <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4">
              <h4 className="font-medium text-secondary dark:text-dark-text mb-3">Coverage Distribution</h4>
              <div className="space-y-2">
                {['General Liability', 'Property', 'Cyber', 'Workers Comp'].map((coverage, index) => {
                  const percentage = Math.floor(Math.random() * 40 + 60);
                  return (
                    <div key={coverage} className="flex items-center justify-between">
                      <span className="text-sm text-secondary dark:text-dark-text">{coverage}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 dark:bg-dark-border rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-accent dark:text-dark-muted w-8">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Premium Analysis */}
            <div className="bg-gray-50 dark:bg-dark-bg rounded-lg p-4">
              <h4 className="font-medium text-secondary dark:text-dark-text mb-3">Premium Analysis</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-accent dark:text-dark-muted">Current Annual Premium</span>
                  <span className="text-sm font-medium text-secondary dark:text-dark-text">
                    ${Math.floor(Math.random() * 5000 + 10000).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-accent dark:text-dark-muted">Market Average</span>
                  <span className="text-sm font-medium text-secondary dark:text-dark-text">
                    ${Math.floor(Math.random() * 3000 + 12000).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-accent dark:text-dark-muted">Potential Savings</span>
                  <span className="text-sm font-medium text-green-600">
                    ${Math.floor(Math.random() * 2000 + 500).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 