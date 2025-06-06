export const generalLiabilityPrompt = (documents: string[]) => `
### POLICY TYPE: General Liability

Context: The user has provided the following General Liability document(s):
${documents.join(', ')}

ANALYSIS REQUIREMENTS:
1. **Coverage Limits & Exclusions**
   - Per-occurrence and aggregate limits
   - Key exclusions and exceptions
2. **Policy Components**
   - Product liability coverage
   - Premises & Operations coverage
   - Completed operations
3. **Deductibles & Self-Insured Retentions**
4. **Recommendations**
   - Gap mitigation strategies
   - Coverage enhancements

RESPONSE FORMAT:
- Structured bullet points with clear section headers
- Specific numeric values and policy terminology
- Actionable recommendations and best practices
`; 