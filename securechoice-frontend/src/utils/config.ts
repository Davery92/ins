// Environment configuration utility
export const config = {
  // Gemini API Configuration
  gemini: {
    apiKey: process.env.REACT_APP_GEMINI_API_KEY || '',
    modelId: process.env.REACT_APP_GEMINI_MODEL_ID || 'gemini-2.5-flash-preview-04-17',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
  },

  // App Configuration
  app: {
    name: process.env.REACT_APP_NAME || 'RiskNinja',
    version: process.env.REACT_APP_VERSION || '1.0.0',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },

  // Feature Flags
  features: {
    enableRealTimeChat: true,
    enableDocumentAnalysis: true,
    enableDarkMode: true,
    enableApiTesting: process.env.NODE_ENV === 'development',
  },
};

// Validation function to check if required environment variables are set
export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.gemini.apiKey) {
    errors.push('REACT_APP_GEMINI_API_KEY is not set');
  }

  if (!config.gemini.modelId) {
    errors.push('REACT_APP_GEMINI_MODEL_ID is not set');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Debug function to log configuration (only in development)
export const logConfig = (): void => {
  if (config.app.isDevelopment) {
    console.group('🔧 RiskNinja Configuration');
    console.log('App Name:', config.app.name);
    console.log('Version:', config.app.version);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Gemini Model:', config.gemini.modelId);
    console.log('API Key Set:', !!config.gemini.apiKey);
    console.log('Features:', config.features);
    
    const validation = validateConfig();
    if (!validation.isValid) {
      console.warn('❌ Configuration Issues:', validation.errors);
    } else {
      console.log('✅ Configuration Valid');
    }
    console.groupEnd();
  }
}; 