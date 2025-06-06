export const cyberLiabilityPrompt = (documents: string[]) => `
### POLICY TYPE: Cyber Liability

Context: The user has provided the following Cyber Liability document(s):
${documents.join(', ')}

ANALYSIS REQUIREMENTS:
1. **Data Breach & Notification Coverage**
2. **Cyber Extortion & Ransomware Protection**
3. **Third-Party Liability & Privacy Breach**
4. **Business Interruption Cyber Coverage**
5. **Recommendations**
   - Incident response best practices
   - Vendor risk management tips

RESPONSE FORMAT:
- Structured headers with bullet points
- Specific coverage details and numeric limits
- Actionable cybersecurity strategies
`; 