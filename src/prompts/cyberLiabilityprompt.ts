export const cyberLiabilityprompt = (documents: string[]) => `
### POLICY TYPE: Cyber Liability

Context: The user has provided the following Cyber Liability document(s):
${documents.join(', ')}

ANALYSIS REQUIREMENTS:
1. **First-Party Coverage**
   - Business interruption & cyber extortion
   - Data restoration & forensic costs
   - Notification & credit monitoring
2. **Third-Party Coverage**
   - Network security liability
   - Privacy liability
   - Regulatory fines & penalties
3. **Exclusions & Limitations**
4. **Recommendations**
   - Cybersecurity best practices
   - Coverage enhancements

RESPONSE FORMAT:
- Structured bullet points with clear headers
- Specific coverage limits and deductibles
- Actionable cybersecurity recommendations
`; 