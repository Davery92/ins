import React from 'react';
import ApiDebugger from '../components/ApiDebugger';

const Support: React.FC = () => {
  return (
    <div className="px-40 flex flex-1 justify-center py-5 dark:bg-dark-bg transition-colors duration-200">
      <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
        <div className="flex flex-wrap justify-between gap-3 p-4">
          <p className="text-secondary dark:text-dark-text tracking-light text-[32px] font-bold leading-tight min-w-72">
            Support & API Testing
          </p>
        </div>
        
        {/* API Debugger for testing */}
        <div className="px-4 py-6">
          <ApiDebugger />
        </div>

        {/* Original Support Content */}
        <div className="px-4 py-6">
          <h2 className="text-secondary dark:text-dark-text text-[22px] font-bold leading-tight tracking-[-0.015em] mb-4">
            Need Help?
          </h2>
          <p className="text-accent dark:text-dark-muted text-base mb-6">
            Our support team is here to help you with any questions about RiskNinja or your insurance policies.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-dark-surface border border-[#d0dee7] dark:border-dark-border rounded-lg p-6">
              <h3 className="font-medium text-secondary dark:text-dark-text mb-2">Documentation</h3>
              <p className="text-accent dark:text-dark-muted text-sm mb-4">
                Find answers to common questions and learn how to use RiskNinja effectively.
              </p>
              <button className="text-primary hover:text-blue-600 text-sm font-medium">
                View Documentation →
              </button>
            </div>
            
            <div className="bg-white dark:bg-dark-surface border border-[#d0dee7] dark:border-dark-border rounded-lg p-6">
              <h3 className="font-medium text-secondary dark:text-dark-text mb-2">Contact Support</h3>
              <p className="text-accent dark:text-dark-muted text-sm mb-4">
                Get personalized help from our insurance experts and technical support team.
              </p>
              <button className="text-primary hover:text-blue-600 text-sm font-medium">
                Contact Us →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support; 