export const commercialAutoPrompt = (documents: string[]) => `
### POLICY TYPE: Commercial Auto

Context: The user has provided the following Commercial Auto document(s):
${documents.join(', ')}

ANALYSIS REQUIREMENTS:
1. **Liability Coverage Limits**
   - Bodily injury & property damage limits
2. **Hired & Non-Owned Auto Coverage**
3. **Fleet Safety & Risk Management**
4. **Cargo & Equipment Coverage**
5. **Recommendations**
   - Fleet management best practices
   - Cost reduction strategies

RESPONSE FORMAT:
- Structured bullet points
- Specific policy details and numeric limits
- Actionable risk mitigation tips
`; 