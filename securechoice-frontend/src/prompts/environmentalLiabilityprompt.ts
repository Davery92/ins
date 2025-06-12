export const environmentalLiabilityPrompt = (documents: string[]) => `
1. **Policy Overview**  
     - Give a concise summary of the policy’s purpose and structure.  
     - Identify the policy type (e.g., “contractor’s pollution liability,” “remediation liability,” etc.).

  2. **Definitions**  
     - List and explain all key defined terms (e.g., “Pollutants,” “Cleanup Costs,” “Covered Site,” “Sudden and Accidental,” etc.).  

  3. **Coverage Analysis**  
     - Break down each coverage part (e.g., Third-Party Bodily Injury & Property Damage, Remediation Costs, Legal Defense, Emergency Response, etc.).  
     - For each, note:  
       • What’s covered  
       • Limits (per occurrence and aggregate)  
       • Deductibles or SIRs  

  4. **Exclusions & Limitations**  
     - Enumerate all exclusions, sub-limits, or carve-backs.  
     - Highlight any unusual or particularly restrictive clauses.

  5. **Risk Gaps & Recommendations**  
     - Point out potential coverage gaps or ambiguities.  
     - Recommend endorsements or policy enhancements that would close those gaps.

  6. **Regulatory & Compliance Notes**  
     - Call out any references to specific environmental statutes or regulations (e.g., CERCLA/Superfund, RCRA, Clean Water Act).  
     - Advise on implications for compliance reporting.

  7. **Questions for Underwriter**  
     - List any follow-up questions you’d ask the carrier or broker to clarify underwriting intent.

  8. **Output Format**  
     - Use clear markdown headings .  
     - Whenever you quote policy language, put it in block quotes.  
     - Summaries should be in bullet lists or tables for easy review.

`; 