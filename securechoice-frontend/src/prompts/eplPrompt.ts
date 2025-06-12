export const eplPrompt = (documents: string[]) => `

Context: The user has provided the following EPL document(s):
${documents.join(', ')}

1. FOUNDATION SETTING
Key Parameters Extracted:

Project Type: Employment Practices Liability (EPL) insurance policy comparison and analysis
Core Tasks:
Initial policy review and data extraction
Detailed comparison development with matrices
Coverage analysis and comparison with matrices and indication of favorable and unfavorable coverage language
Scoring and ranking policy forms as most favorable and least favorable with reasoning and confidence index
Primary Objectives:
Deliver 100% accurate policy coverage analysis on a line-by-line basis
Create comprehensive comparison deliverables
Provide strategic recommendations for decision-making
Deliverables:
Excel spreadsheet (CSV format) with detailed comparisons
Comparison matrix for visual reference
Executive summary (2-3 pages)
Knowledge Domains Identified:
Primary - Insurance policy construction, coverage language interpretation and employment practice liability coverage specifics
Secondary – Insurance consulting, risk assessment, employment law
Tertiary: Data analysis, presentation design, communication
Baseline Assumptions:

Client operates in identifiable industry with specific EPL risks
Multiple policy options are available for comparison
Human expert will validate AI analysis for accuracy
Analytical rigor is critical
2. COGNITIVE FRAMEWORK
Knowledge Domain Mapping:
Insurance coverage + employment law = Comprehensive risk assessment
Financial modeling + industry specifics = Relevant scenario planning
Strategic planning + client priorities = Actionable recommendations
3. ANALYTICAL APPROACH SELECTION
Primary Approach: 
Comparative Analysis
Systematic side-by-side policy evaluation
Structured assessment of coverage provisions
Quantitative scoring methodology
Supporting Approaches:
Systems Analysis - Understanding interdependencies between coverage areas
Heuristic Analysis: Expert-driven prioritization and weighting
Shift Criteria: 
Move from comparative to systems approach when identifying coverage gaps that require holistic evaluation

4. INFORMATION ARCHITECTURE
Primary Elements:
Policy provisions including insuring agreements, exclusions, definitions, conditions and endorsements
Declarations review including coverage limits, deductibles, retroactive dates, prior and pending litigation dates, extended reporting periods
Premium structures and costs
Claims reporting
Secondary Elements:
Industry-specific endorsements
Territory and jurisdiction coverage
Defense cost arrangements
Supporting Elements:
Carrier stability ratings – search internet for this information
Information Hierarchy:
Level 1- Core Coverage Provisions
Level 2 - Policy Terms and Conditions
Level 3 - Specific Industry Applications
Level 4: Cost-Benefit Analysis

5. PROJECT OVERVIEW FORMULATION
Executive Summary: This EPL insurance analysis protocol provides a systematic approach to comparing employment practices liability policies, combining human expertise with AI-driven analysis to deliver accurate, actionable insurance recommendations through structured comparison matrices, and strategic evaluation.
Tiered Overviews:
Executive Level: Strategic policy selection framework focused on optimizing EPL coverage while managing costs and risks
Management Level: Detailed comparison protocol with specific deliverables, quality controls, and collaboration methods
Operational Level: Step-by-step execution procedures with defined human-AI interaction points and technical specifications

6. CONTEXT ENHANCEMENT
Critical Information Gaps Requiring User Input:
If your analysis requires additional context, then ask structured questions to the User as logical points within the chat
7. DELIVERABLE SPECIFICATION
Excel Spreadsheet (CSV Format)
Content - Line-item comparisons with highlighting for differences
Formatting - Professional presentation without commas in numbers
Quality Standard: 100% accuracy verified through dual review
Comparison Matrix:
Design - Visual grid with emphasis on comparison for decision making support
Content - High-level coverage summary with symbols/legends
Format – Prioritize rigor and accuracy, multi-page with no constraints on number of rows 
Quality Standard: Clear visual hierarchy, easy interpretation
Executive Summary:
Length: 2-3 pages maximum
Structure: Methodology → Key Findings → Recommendations → Implementation
Tone: Strategic, confident, actionable language
Quality Standard: Enables confident decision-making without additional documentation
9. VALIDATION PROTOCOL
Verification Methods:
Coverage Analysis: Cross-reference with policy language, verify with insurance expert
Checkpoints:
Initial policy extraction validation (after Step 1)
Comparison matrix accuracy check (after Step 2)
Final deliverable review (before submission)
Confidence Levels:
High Confidence - Direct policy language quotations, mathematical calculations
Medium Confidence - Interpretive analysis, market positioning
Low Confidence - Future cost projections, subjective assessments
10. QUALITY ASSURANCE FRAMEWORK
Quality Metrics:
Accuracy - 100% for factual content, 0 errors in coverage analysis
Completeness - All comparison areas addressed with rigor and accuracy
Clarity: Executive summary enables decision without additional clarification
Professional Standards: All deliverables meet business presentation requirements
Review Protocols:
Self-review by AI for data extraction accuracy
Human expert review for insurance interpretation
Collaborative validation for scoring methodology
Final quality check against checklist
Integration Standards:
Cross-reference between deliverables maintained
Consistent terminology throughout all documents
Aligned recommendations across all formats
11. SUCCESS MEASUREMENT PARAMETERS
Quantitative Metrics:
Accuracy Rate - Target 100% for coverage analysis

Qualitative Metrics:
Strategic Value - Recommendation adoption rate >80%
Presentation Quality - Client satisfaction with format/clarity
Analytical Depth - Independent expert validation of analysis rigor
KPI Dashboard:
All comparison areas completed
Zero factual errors identified
Executive summary standalone sufficiency
Client decision confidence level
Implementation success rate
12. FEEDBACK INTEGRATION MECHANISM
Feedback Collection Points:
After initial policy review presentation
Upon comparison matrix delivery
Following executive summary review
Post-implementation assessment
Integration Protocol:
Immediate corrections for factual errors
Methodology adjustments for clarity issues
Presentation modifications for client preference
Process improvements for future projects
Adaptation Triggers:
Client requests significant scope changes
New policy options become available
Market conditions shift dramatically
Quality metrics fall below thresholds

13. SUCCESS CRITERIA SUMMARY:
All comparison areas completed
100% accuracy verified
Executive summary enables confident decision-making
Professional presentation standards met

`; 