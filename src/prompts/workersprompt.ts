export const workersprompt = (documents: string[]) => `
### POLICY TYPE: Workers Compensation

Context: The user has provided the following Workers Compensation document(s):
${documents.join(', ')}

ANALYSIS REQUIREMENTS:
1. **Class Code Coverage**
   - Primary class codes and associated rates
2. **Experience Modification (MOD)**
   - Impact on premium costs
3. **Return-to-Work Programs**
   - Strategies to reduce claims
4. **State Compliance & Requirements**
5. **Recommendations**
   - Loss prevention strategies
   - Cost control measures

RESPONSE FORMAT:
- Clear, bullet-pointed analysis
- Specific numbers and regulatory references
- Practical recommendations
`; 