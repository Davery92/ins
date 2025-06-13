import React from 'react';
import { Link } from 'react-router-dom';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  linkTo: string;
  linkText: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  linkTo,
  linkText
}) => {
  return (
    <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-shrink-0 p-3 bg-primary/10 rounded-lg text-primary">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-secondary dark:text-dark-text">
          {title}
        </h3>
      </div>
      
      <p className="text-accent dark:text-dark-muted mb-6 leading-relaxed">
        {description}
      </p>
      
      <Link
        to={linkTo}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
      >
        {linkText}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
        </svg>
      </Link>
    </div>
  );
};

export default FeatureCard; 