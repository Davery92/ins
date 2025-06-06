export const professionalLiabilityPrompt = (documents: string[]) => `
### POLICY TYPE: Professional Liability (Errors & Omissions)

Context: The user has provided the following Professional Liability document(s):
${documents.join(', ')}

ANALYSIS REQUIREMENTS:
1. **Coverage Limits & Scope**
   - E&O limits per claim and aggregate
2. **Exclusions & Extensions**
   - Common exclusions and supplemental coverage options
3. **Retroactive Date & Prior Acts Coverage**
4. **Deductibles & Self-Insured Retentions**
5. **Recommendations**
   - Risk management and policy enhancements

RESPONSE FORMAT:
- Clear headers and bullet points
- Specific policy details and numeric values
- Actionable professional liability mitigation strategies
`; 