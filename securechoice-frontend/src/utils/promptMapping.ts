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
      return (docs: string[]) => generalLiabilityPrompt(docs);
    case 'professional-liability':
      return (docs: string[]) => professionalLiabilityPrompt(docs);
    case 'workers-comp':
      return (docs: string[]) => workersCompPrompt(docs);
    case 'commercial-auto':
      return (docs: string[]) => commercialAutoPrompt(docs);
    case 'property':
      return (docs: string[]) => propertyPrompt(docs);
    case 'cyber-liability':
      return (docs: string[]) => cyberLiabilityPrompt(docs);
    case 'environmental-liability':
      return (docs: string[]) => environmentalLiabilityPrompt(docs);
    case 'directors-officers':
      return (docs: string[]) => directorsOfficersPrompt(docs);
    case 'epl':
      return (docs: string[]) => eplPrompt(docs);
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
      return (docs: string[]) => compareLiabilityprompt(docs);
    case 'workers-comp':
      // TODO: Add compareWorkersprompt when available
      return (docs: string[]) => compareLiabilityprompt(docs); // Fallback for now
    case 'commercial-auto':
      // TODO: Add compareAutoprompt when available
      return (docs: string[]) => compareLiabilityprompt(docs); // Fallback for now
    case 'property':
      return (docs: string[]) => comparePropertyprompt(docs);
    case 'cyber-liability':
      return (docs: string[]) => compareCyberprompt(docs);
    case 'environmental-liability':
      // TODO: Add compareEnvironmentalprompt when available
      return (docs: string[]) => compareLiabilityprompt(docs); // Fallback for now
    case 'directors-officers':
      // TODO: Add compareDirectorsprompt when available
      return (docs: string[]) => compareLiabilityprompt(docs); // Fallback for now
    case 'epl':
      // TODO: Add compareeplPrompt when available
      return (docs: string[]) => compareLiabilityprompt(docs); // Fallback for now
    default:
      // Fallback to liability comparison prompt
      return (docs: string[]) => compareLiabilityprompt(docs);
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