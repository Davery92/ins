export const environmentalLiabilityPrompt = (documents: string[]) => `
### POLICY TYPE: Environmental Liability

Context: The user has provided the following Environmental Liability document(s):
${documents.join(', ')}

ANALYSIS REQUIREMENTS:
1. **Pollution & Remediation Coverage**
2. **Site-Specific Conditions & Exclusions**
3. **Legal & Regulatory Compliance**
4. **Third-Party Liability**
5. **Recommendations**
   - Risk mitigation and environmental management

RESPONSE FORMAT:
- Clear section headers with bullet points
- Specific policy details and coverage limits
- Practical environmental risk strategies
`; 