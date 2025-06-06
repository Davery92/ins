export const directorsOfficersPrompt = (documents: string[]) => `
### POLICY TYPE: Directors & Officers Liability

Context: The user has provided the following D&O document(s):
${documents.join(', ')}

ANALYSIS REQUIREMENTS:
1. **Coverage Scope**
   - Side A, B & C coverage details
2. **Insured Persons & Entity Coverage**
3. **Exclusions & Extension Options**
4. **Policy Limits & Deductibles**
5. **Recommendations**
   - Governance best practices
   - Liability mitigation strategies

RESPONSE FORMAT:
- Structured bullet points with clear headers
- Specific limits and policy terminology
- Actionable recommendations for corporate governance
`; 