export const propertyPrompt = (documents: string[]) => `
### POLICY TYPE: Property Insurance

Context: The user has provided the following Property Insurance document(s):
${documents.join(', ')}

ANALYSIS REQUIREMENTS:
1. **Building Coverage & Limits**
   - Replacement cost vs actual cash value
2. **Business Personal Property**
3. **Perils & Exclusions**
4. **Business Interruption Coverage**
5. **Recommendations**
   - Coverage optimization suggestions
   - Disaster preparedness strategies

RESPONSE FORMAT:
- Bullet-pointed analysis with headers
- Specific coverage details and values
- Actionable recommendations
`; 