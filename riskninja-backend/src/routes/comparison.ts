import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkLicense } from '../middleware/checkLicense';
import { PolicyDocumentModel } from '../models';
import { aiService } from '../services/aiService';

const router = Router();

interface ComparisonRequest {
  documentIds: string[];
  additionalFacts?: string;
  documents?: {
    id: string;
    name: string;
    extractedText: string;
  }[];
}

// POST /api/comparison/generate - generate comparison report for selected documents
router.post(
  '/generate',
  authenticateToken,
  checkLicense,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { documentIds, additionalFacts, documents: clientDocuments }: ComparisonRequest = req.body;

      if (!documentIds || documentIds.length < 2) {
        res.status(400).json({ error: 'At least 2 documents are required for comparison' });
        return;
      }

      // Fetch documents from database to ensure they belong to the user
      const documents = await PolicyDocumentModel.findAll({
        where: { 
          id: documentIds,
          userId: userId
        },
        order: [['uploadedAt', 'DESC']]
      });

      if (documents.length !== documentIds.length) {
        res.status(404).json({ error: 'One or more documents not found or not authorized' });
        return;
      }

      // Build the comparison prompt
      const prompt = buildComparisonPrompt(documents, additionalFacts);

      console.log('Generating comparison report for user:', userId, 'documents:', documentIds.length);

      // Generate the comparison report using AI service
      const report = await aiService.generateReport(prompt);

      res.json({
        report: report,
        documentIds: documentIds,
        documentsCompared: documents.map(doc => ({
          id: doc.id,
          name: doc.name,
          uploadedAt: doc.uploadedAt
        })),
        generatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Comparison report generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate comparison report',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
);

/**
 * Build a comprehensive prompt for document comparison using the existing compare policies prompt
 */
function buildComparisonPrompt(documents: any[], additionalFacts?: string): string {
  const documentsSummary = documents.map((doc, index) => {
    return `
## Document ${index + 1}: ${doc.name}

**Document Details:**
- File Name: ${doc.name}
- Upload Date: ${new Date(doc.uploadedAt).toLocaleDateString()}
- Document Type: ${doc.policyType || 'Not specified'}
- File Size: ${(doc.size / (1024 * 1024)).toFixed(2)} MB

**Document Content:**
${doc.extractedText || 'No text content available'}

---
`;
  }).join('\n');

  const additionalContext = additionalFacts ? `
## Additional Context and Requirements Provided by User

${additionalFacts}

---
` : '';

  // Use the existing compare policies prompt structure
  const basePrompt = `
### REAL-TIME AI-ASSISTED INSURANCE POLICY COMPARISON

You are an expert insurance analyst conducting a comprehensive comparison of the following insurance policy documents. Apply the established framework for policy comparison analysis.

${documentsSummary}

${additionalContext}

### COMPARISON ANALYSIS FRAMEWORK

**Primary Objective:** Create a comprehensive comparison matrix analyzing insurance policies to identify all significant differences with supporting analysis for informed decision-making.

**Analysis Approach:** 
- Implement immediate side-by-side examination of equivalent policy elements
- Apply rapid assessment of materiality for each difference
- Use direct language quotes to substantiate key variances
- Employ confidence rating system (1-5 scale) to indicate certainty level

**Information Architecture - Hierarchical Comparison Matrix:**
- **Level 1 (Essential):** Material differences in insuring agreements, limits, deductibles, exclusions
- **Level 2 (Critical):** Changes in definitions, conditions, territories, endorsements  
- **Level 3 (Supporting):** Administrative requirements, reporting obligations, premium calculations

### REQUIRED DELIVERABLE SPECIFICATIONS

**Comparison Matrix Format:**
- Structured table with policy elements as rows, documents as columns
- Side-by-side presentation of critical policy provisions
- Immediate highlighting of material differences
- Direct references to key policy language
- Confidence rating (1-5 scale) for each comparison

**Executive Summary Requirements:**
- 3-5 bullet points highlighting critical findings
- Material differences organized by significance
- Immediate implications for coverage adequacy
- Compact presentation of critical changes

### PRIORITIZATION FRAMEWORK

**Priority Focus Areas:**
| Priority | Impact | Elements |
|----------|--------|----------|
| Critical | High | • Insuring agreements<br>• Coverage limits<br>• Major exclusions |
| High | Medium-High | • Key definitions<br>• Essential conditions<br>• Primary endorsements |
| Medium | Medium | • Secondary provisions<br>• Administrative elements |

### DETAILED ANALYSIS REQUIREMENTS

1. **Coverage Comparison Analysis**
   - Coverage types provided by each document
   - Coverage limits, deductibles, and maximum payouts
   - Key exclusions and limitations
   - Geographic and territorial coverage
   - Policy periods and renewal terms

2. **Terms and Conditions Analysis**
   - Key definitions comparison
   - Claims procedures and requirements
   - Cancellation and renewal provisions
   - Unique terms or special conditions

3. **Gap Analysis**
   - Coverage gaps between policies
   - Areas of overlap or conflict
   - Overall portfolio completeness assessment

4. **Risk Assessment**
   - Coverage adequacy analysis
   - Potential exposures or vulnerabilities
   - Risk mitigation features comparison

5. **Actionable Recommendations**
   - Specific recommendations prioritized by importance
   - Optimal coverage combinations if applicable
   - Additional coverage considerations
   - Time-sensitive elements requiring attention

### FORMATTING AND PRESENTATION

- Use clear markdown headers and subheaders for navigation
- Apply bullet points and tables for clarity
- Include specific document name references
- Maintain professional language for insurance professionals
- Ensure comprehensive yet concise presentation
- Apply confidence ratings for key comparisons

Generate a thorough, professional comparison report following this established framework.
`;

  return basePrompt;
}

export default router; 