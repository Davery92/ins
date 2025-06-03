import React, { useState, useEffect } from 'react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTourProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ isVisible, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to RiskNinja! 🛡️',
      description: 'Your AI-powered commercial insurance analysis platform. Let\'s take a quick tour to get you started.',
      target: 'body',
      position: 'bottom'
    },
    {
      id: 'policy-type',
      title: 'Select Your Policy Type',
      description: 'Start by selecting the type of commercial insurance you want to analyze. This helps our AI provide targeted insights.',
      target: '[data-tour="policy-selector"]',
      position: 'bottom'
    },
    {
      id: 'upload',
      title: 'Upload Your Documents',
      description: 'Drag and drop your commercial insurance policy documents here. We support PDF, DOC, and DOCX formats.',
      target: '[data-tour="upload-area"]',
      position: 'top'
    },
    {
      id: 'chat',
      title: 'Chat with RiskNinja AI',
      description: 'Ask questions about your policies, get risk assessments, and receive personalized recommendations through our AI chat.',
      target: '[data-tour="chat-interface"]',
      position: 'top'
    },
    {
      id: 'dashboard',
      title: 'Business Intelligence Dashboard',
      description: 'Once you upload documents, access comprehensive analytics, risk analysis, and policy comparison tools.',
      target: '[data-tour="dashboard"]',
      position: 'top'
    },
    {
      id: 'complete',
      title: 'You\'re All Set! 🎉',
      description: 'Start by uploading your first commercial insurance policy document and explore RiskNinja\'s powerful AI features.',
      target: 'body',
      position: 'bottom'
    }
  ];

  useEffect(() => {
    if (isVisible) {
      setIsActive(true);
      setCurrentStep(0);
    } else {
      setIsActive(false);
    }
  }, [isVisible]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    onComplete();
  };

  const handleSkip = () => {
    setIsActive(false);
    onSkip();
  };

  if (!isActive || !isVisible) return null;

  const currentStepData = steps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 pointer-events-auto">
        {/* Tour Tooltip */}
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-dark-surface rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 z-51">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2Z" />
                </svg>
              </div>
              <span className="text-sm text-accent dark:text-dark-muted">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <button
              onClick={handleSkip}
              className="text-accent dark:text-dark-muted hover:text-secondary dark:hover:text-dark-text text-sm"
            >
              Skip Tour
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-2 mb-6">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Content */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-secondary dark:text-dark-text mb-3">
              {currentStepData.title}
            </h3>
            <p className="text-accent dark:text-dark-muted leading-relaxed">
              {currentStepData.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-accent dark:text-dark-muted hover:text-secondary dark:hover:text-dark-text'
              }`}
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-primary'
                      : index < currentStep
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-dark-border'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextStep}
              className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default OnboardingTour; 