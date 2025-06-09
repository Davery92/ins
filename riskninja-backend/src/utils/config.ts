import dotenv from 'dotenv';

dotenv.config();

export const config = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || '',
    modelId: process.env.GEMINI_MODEL_ID || process.env.REACT_APP_GEMINI_MODEL_ID || 'gemini-2.5-flash-preview',
    baseUrl: process.env.GEMINI_BASE_URL || process.env.REACT_APP_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models',
  },
};

export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!config.gemini.apiKey) {
    errors.push('GEMINI_API_KEY is not set');
  }
  if (!config.gemini.modelId) {
    errors.push('GEMINI_MODEL_ID is not set');
  }
  return { isValid: errors.length === 0, errors };
};

export const logConfig = (): void => {
  if (process.env.NODE_ENV === 'development') {
    console.group('🔧 RiskNinja Configuration');
    console.log('Gemini Model:', config.gemini.modelId);
    console.log('API Key Set:', !!config.gemini.apiKey);
    console.groupEnd();
  }
}; 