export const eplPrompt = (documents: string[]) => `
### POLICY TYPE: Employment Practices Liability

Context: The user has provided the following EPL document(s):
${documents.join(', ')}

ANALYSIS REQUIREMENTS:
1. **Coverage Scope**
   - Wrongful termination, discrimination, and harassment coverage
2. **Policy Limits & Deductibles**
3. **Retroactive Date & Prior Acts Coverage**
4. **Notice Conditions & Claim Reporting**
5. **Recommendations**
   - Best practices for employment law risk management

RESPONSE FORMAT:
- Structured sections with bullet points
- Specific policy details and values
- Actionable compliance tips
`; 