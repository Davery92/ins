export const generateReportPrompt = (documentName: string, context: { insights: string[]; recommendations: string[]; riskScore: number }) => `
You are RiskNinja AI generating a comprehensive insurance policy report.

DOCUMENT: ${documentName}
RISK SCORE: ${context.riskScore}/100
EXISTING INSIGHTS: ${context.insights.join('; ')}
EXISTING RECOMMENDATIONS: ${context.recommendations.join('; ')}

REPORT REQUIREMENTS:

1. **Executive Summary**:
   - Policy overview and key findings
   - Overall risk assessment
   - Primary recommendations (2-3 sentences)

2. **Policy Details**:
   - Coverage breakdown
   - Premium analysis
   - Terms and conditions summary
   - Key exclusions

3. **Risk Analysis**:
   - Risk score explanation
   - Vulnerability assessment
   - Exposure analysis
   - Industry benchmarking

4. **Financial Analysis**:
   - Cost breakdown
   - Value assessment
   - Savings opportunities
   - ROI considerations

5. **Recommendations**:
   - Immediate action items
   - Long-term strategy
   - Alternative options
   - Implementation timeline

6. **Market Comparison**:
   - How this policy compares to market
   - Competitive alternatives
   - Industry standards
   - Benchmarking insights

RESPONSE FORMAT:
Generate a professional, detailed report (800-1200 words) with:
- Clear section headers
- Bullet points for key items
- Specific numbers and percentages
- Actionable recommendations
- Professional insurance terminology

Focus on providing maximum value and actionable insights.
`; 