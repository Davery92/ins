// Import all the prompts
import {
  generalLiabilityPrompt,
  professionalLiabilityPrompt,
  workersCompPrompt,
  commercialAutoPrompt,
  propertyPrompt,
  cyberLiabilityPrompt,
  environmentalLiabilityPrompt,
  directorsOfficersPrompt,
  eplPrompt,
  compareLiabilityprompt,
  compareCyberprompt,
  comparePropertyprompt,
  documentAnalysisPrompt
} from '../prompts';

// Policy type to analysis prompt mapping (returns function that takes documents array)
export const getAnalysisPrompt = (policyType: string): ((documents: string[]) => string) => {
  switch (policyType) {
    case 'general-liability':
      return generalLiabilityPrompt;
    case 'professional-liability':
      return professionalLiabilityPrompt;
    case 'workers-comp':
      return workersCompPrompt;
    case 'commercial-auto':
      return commercialAutoPrompt;
    case 'property':
      return propertyPrompt;
    case 'cyber-liability':
      return cyberLiabilityPrompt;
    case 'environmental-liability':
      return environmentalLiabilityPrompt;
    case 'directors-officers':
      return directorsOfficersPrompt;
    case 'epl':
      return eplPrompt;
    default:
      // Fallback to generic document analysis prompt (adapt to documents array)
      return (documents: string[]) => documentAnalysisPrompt(documents.join(', '));
  }
};

// Policy type to comparison prompt mapping
export const getComparisonPrompt = (policyType: string): ((documents: string[]) => string) => {
  switch (policyType) {
    case 'general-liability':
    case 'professional-liability':
      return compareLiabilityprompt;
    case 'workers-comp':
      // TODO: Add compareWorkersprompt when available
      return compareLiabilityprompt; // Fallback for now
    case 'commercial-auto':
      // TODO: Add compareAutoprompt when available
      return compareLiabilityprompt; // Fallback for now
    case 'property':
      return comparePropertyprompt;
    case 'cyber-liability':
      return compareCyberprompt;
    case 'environmental-liability':
      // TODO: Add compareEnvironmentalprompt when available
      return compareLiabilityprompt; // Fallback for now
    case 'directors-officers':
      // TODO: Add compareDirectorsprompt when available
      return compareLiabilityprompt; // Fallback for now
    case 'epl':
      // TODO: Add compareeplPrompt when available
      return compareLiabilityprompt; // Fallback for now
    default:
      // Fallback to liability comparison prompt
      return compareLiabilityprompt;
  }
};

// Helper function to determine the primary policy type from selected documents
export const determinePrimaryPolicyType = (documents: any[]): string => {
  if (documents.length === 0) return 'general-liability';
  
  // Get all unique policy types from selected documents
  const policyTypes = documents
    .map(doc => doc.policyType)
    .filter(type => type) // Remove undefined/null values
    .filter((type, index, arr) => arr.indexOf(type) === index); // Remove duplicates
  
  // If all documents are the same policy type, use that
  if (policyTypes.length === 1) {
    return policyTypes[0];
  }
  
  // If multiple policy types, prioritize in this order:
  const priorityOrder = [
    'general-liability',
    'professional-liability', 
    'property',
    'cyber-liability',
    'workers-comp',
    'commercial-auto',
    'directors-officers',
    'epl',
    'environmental-liability'
  ];
  
  // Return the highest priority policy type found
  for (const priorityType of priorityOrder) {
    if (policyTypes.includes(priorityType)) {
      return priorityType;
    }
  }
  
  // Fallback
  return 'general-liability';
}; 