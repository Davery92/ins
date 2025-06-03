export const comparePoliciesPrompt = (documents: string[]) => `Compare these insurance policy documents: ${documents.join(", ")}. Provide side-by-side analysis with recommendations.`;
