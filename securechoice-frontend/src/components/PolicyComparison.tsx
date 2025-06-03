import React, { useState, useEffect } from 'react';
import { aiService } from '../services/aiService';

export interface PolicyOption {
  id: string;
  provider: string;
  planName: string;
  monthlyPremium: number;
  annualPremium: number;
  deductible: number;
  coverageLimit: number;
  features: string[];
  pros: string[];
  cons: string[];
  riskScore: number;
  aiRecommendation?: string;
}

interface PolicyComparisonProps {
  policies: PolicyOption[];
  onSelectPolicy?: (policyId: string) => void;
  showAIInsights?: boolean;
  className?: string;
}

const PolicyComparison: React.FC<PolicyComparisonProps> = ({
  policies,
  onSelectPolicy,
  showAIInsights = true,
  className = ''
}) => {
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<{ [key: string]: string }>({});
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    if (showAIInsights && policies.length > 0) {
      generateAIInsights();
    }
  }, [policies, showAIInsights]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateAIInsights = async () => {
    setLoadingInsights(true);
    
    try {
      const insights: { [key: string]: string } = {};
      
      for (const policy of policies) {
        const prompt = `Analyze this insurance policy and provide a brief recommendation:
        Provider: ${policy.provider}
        Plan: ${policy.planName}
        Premium: $${policy.monthlyPremium}/month
        Deductible: $${policy.deductible}
        Coverage: $${policy.coverageLimit.toLocaleString()}
        Features: ${policy.features.join(', ')}
        
        Provide a 2-3 sentence recommendation focusing on value and suitability.`;
        
        await aiService.sendMessage(prompt, (response) => {
          insights[policy.id] = response;
          setAiInsights(prev => ({ ...prev, [policy.id]: response }));
        });
      }
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleSelectPolicy = (policyId: string) => {
    setSelectedPolicy(policyId);
    onSelectPolicy?.(policyId);
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    if (score >= 60) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
    return 'text-red-600 bg-red-50 dark:bg-red-900/20';
  };

  const getRiskScoreLabel = (score: number) => {
    if (score >= 80) return 'Low Risk';
    if (score >= 60) return 'Medium Risk';
    return 'High Risk';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (policies.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-accent dark:text-dark-muted">
          No policies to compare. Upload your documents to get started.
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-secondary dark:text-dark-text">
          Policy Comparison
        </h3>
        {loadingInsights && (
          <div className="flex items-center gap-2 text-sm text-accent dark:text-dark-muted">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            Generating AI insights...
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {policies.map((policy) => (
          <div
            key={policy.id}
            className={`bg-white dark:bg-dark-surface border-2 rounded-lg p-6 transition-all duration-200 cursor-pointer hover:shadow-lg ${
              selectedPolicy === policy.id
                ? 'border-primary shadow-lg'
                : 'border-[#d0dee7] dark:border-dark-border hover:border-primary/50'
            }`}
            onClick={() => handleSelectPolicy(policy.id)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-bold text-lg text-secondary dark:text-dark-text">
                  {policy.provider}
                </h4>
                <p className="text-accent dark:text-dark-muted text-sm">
                  {policy.planName}
                </p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskScoreColor(policy.riskScore)}`}>
                {getRiskScoreLabel(policy.riskScore)}
              </div>
            </div>

            {/* Pricing */}
            <div className="mb-4">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold text-secondary dark:text-dark-text">
                  {formatCurrency(policy.monthlyPremium)}
                </span>
                <span className="text-accent dark:text-dark-muted text-sm">/month</span>
              </div>
              <div className="text-sm text-accent dark:text-dark-muted">
                {formatCurrency(policy.annualPremium)} annually
              </div>
            </div>

            {/* Key Details */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-accent dark:text-dark-muted">Deductible:</span>
                <span className="font-medium text-secondary dark:text-dark-text">
                  {formatCurrency(policy.deductible)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-accent dark:text-dark-muted">Coverage Limit:</span>
                <span className="font-medium text-secondary dark:text-dark-text">
                  {formatCurrency(policy.coverageLimit)}
                </span>
              </div>
            </div>

            {/* Features */}
            <div className="mb-4">
              <h5 className="font-medium text-secondary dark:text-dark-text mb-2 text-sm">
                Key Features:
              </h5>
              <ul className="space-y-1">
                {policy.features.slice(0, 3).map((feature, index) => (
                  <li key={index} className="text-xs text-accent dark:text-dark-muted flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-green-500 flex-shrink-0">
                      <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z" />
                    </svg>
                    {feature}
                  </li>
                ))}
                {policy.features.length > 3 && (
                  <li className="text-xs text-primary">
                    +{policy.features.length - 3} more features
                  </li>
                )}
              </ul>
            </div>

            {/* AI Insights */}
            {showAIInsights && aiInsights[policy.id] && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-primary">AI Recommendation</span>
                </div>
                <p className="text-xs text-secondary dark:text-dark-text leading-relaxed">
                  {aiInsights[policy.id]}
                </p>
              </div>
            )}

            {/* Pros and Cons */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <h6 className="text-xs font-medium text-green-600 mb-1">Pros:</h6>
                <ul className="space-y-1">
                  {policy.pros.slice(0, 2).map((pro, index) => (
                    <li key={index} className="text-xs text-accent dark:text-dark-muted">
                      • {pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h6 className="text-xs font-medium text-red-600 mb-1">Cons:</h6>
                <ul className="space-y-1">
                  {policy.cons.slice(0, 2).map((con, index) => (
                    <li key={index} className="text-xs text-accent dark:text-dark-muted">
                      • {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Select Button */}
            <button
              className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                selectedPolicy === policy.id
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-dark-bg text-secondary dark:text-dark-text hover:bg-slate-200 dark:hover:bg-dark-border'
              }`}
            >
              {selectedPolicy === policy.id ? 'Selected' : 'Select Policy'}
            </button>
          </div>
        ))}
      </div>

      {/* Comparison Summary */}
      {selectedPolicy && (
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg p-6">
          <h4 className="font-bold text-secondary dark:text-dark-text mb-3">
            🎯 Your Selection Summary
          </h4>
          {(() => {
            const selected = policies.find(p => p.id === selectedPolicy);
            return selected ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-accent dark:text-dark-muted">Selected Policy:</span>
                  <p className="font-medium text-secondary dark:text-dark-text">
                    {selected.provider} - {selected.planName}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-accent dark:text-dark-muted">Monthly Premium:</span>
                  <p className="font-medium text-secondary dark:text-dark-text">
                    {formatCurrency(selected.monthlyPremium)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-accent dark:text-dark-muted">Risk Level:</span>
                  <p className="font-medium text-secondary dark:text-dark-text">
                    {getRiskScoreLabel(selected.riskScore)}
                  </p>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
};

export default PolicyComparison; 