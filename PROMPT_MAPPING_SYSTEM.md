# Prompt Mapping System Documentation

This document outlines how the prompt system maps different policy types to specialized analysis and comparison prompts in the RiskNinja application.

## 🔄 **System Overview**

The prompt mapping system works in three stages:

1. **Document Upload & Policy Type Assignment**
2. **Policy Type → Prompt Selection**
3. **Analysis/Comparison Execution**

## 📋 **Policy Type Assignment Process**

### **Step 1: Document Upload**
When users upload insurance documents, they select from a dropdown with these policy types:

```javascript
const policyTypes = [
  { value: 'general-liability', label: 'General Liability' },
  { value: 'workers-comp', label: 'Workers Comp' },
  { value: 'commercial-auto', label: 'Commercial Auto' },
  { value: 'property', label: 'Property' },
  { value: 'epl', label: 'EPL' },
  { value: 'professional-liability', label: 'Professional Liability' },
  { value: 'cyber-liability', label: 'Cyber Liability' },
  { value: 'environmental-liability', label: 'Environmental Liability' },
  { value: 'directors-officers', label: 'Directors & Officers' }
];
```

### **Step 2: Metadata Storage**
The selected policy type is stored as the `policyType` field in the document record:

```sql
-- Database Schema
CREATE TABLE policy_documents (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  policy_type VARCHAR, -- Stores the policy type metadata
  uploaded_at TIMESTAMP,
  extracted_text TEXT,
  -- ... other fields
);
```

### **Step 3: Prompt Selection**
When documents are analyzed or compared, the system uses the `policyType` to select the appropriate specialized prompt.

## 🎯 **Prompt Mapping Tables**

### **Individual Document Analysis**

| Policy Type | Database Value | Prompt File | Function Name |
|-------------|---------------|-------------|---------------|
| General Liability | `general-liability` | `glprompt.ts` | `glprompt()` |
| Professional Liability | `professional-liability` | `proLiabilityprompt.ts` | `proLiabilityprompt()` |
| Workers Comp | `workers-comp` | `workersprompt.ts` | `workersprompt()` |
| Commercial Auto | `commercial-auto` | `autoprompt.ts` | `autoprompt()` |
| Property | `property` | `propertyprompt.ts` | `propertyprompt()` |
| EPL | `epl` | `eplPrompt.ts` | `eplPrompt()` |
| Cyber Liability | `cyber-liability` | `cyberLiabilityprompt.ts` | `cyberLiabilityprompt()` |
| Environmental Liability | `environmental-liability` | `enviroLiabilityprompt.ts` | `enviroLiabilityprompt()` |
| Directors & Officers | `directors-officers` | `doprompt.ts` | `doprompt()` |

### **Document Comparison Analysis**

| Policy Type | Database Value | Prompt File | Function Name |
|-------------|---------------|-------------|---------------|
| General Liability | `general-liability` | `compareLiabilityprompt.ts` | `compareLiabilityprompt()` |
| Professional Liability | `professional-liability` | `compareLiabilityprompt.ts` | `compareLiabilityprompt()` |
| Workers Comp | `workers-comp` | `compareWorkersprompt.ts` | `compareWorkersprompt()` |
| Commercial Auto | `commercial-auto` | `compareAutoprompt.ts` | `compareAutoprompt()` |
| Property | `property` | `comparePropertyprompt.ts` | `comparePropertyprompt()` |
| EPL | `epl` | `compareeplPrompt.ts` | `compareeplPrompt()` |
| Cyber Liability | `cyber-liability` | `compareCyberprompt.ts` | `compareCyberprompt()` |
| Environmental Liability | `environmental-liability` | `compareEnvironmentalprompt.ts` | `compareEnvironmentalprompt()` |
| Directors & Officers | `directors-officers` | `compareDirectorsprompt.ts` | `compareDirectorsprompt()` |

## 🔍 **How Prompt Selection Works**

### **Individual Analysis Flow**
```javascript
// 1. Document gets uploaded with policy type
const document = {
  name: "ACME Corp GL Policy.pdf",
  policyType: "general-liability"
};

// 2. When analyzing, system selects appropriate prompt
const prompt = selectAnalysisPrompt(document.policyType);
// Returns: glprompt()

// 3. AI analysis uses specialized prompt
const analysis = await aiService.analyze(document, prompt);
```

### **Comparison Analysis Flow**
```javascript
// 1. Multiple documents selected for comparison
const documents = [
  { name: "Policy A.pdf", policyType: "general-liability" },
  { name: "Policy B.pdf", policyType: "general-liability" }
];

// 2. System selects comparison prompt based on policy type
const prompt = selectComparisonPrompt(documents[0].policyType);
// Returns: compareLiabilityprompt()

// 3. AI comparison uses specialized prompt
const comparison = await aiService.compare(documents, prompt);
```

## 📁 **File Structure**

```
src/prompts/
├── index.ts                          # Exports all prompts
├── documentAnalysisPrompt.ts          # Generic analysis prompt
├── comparePoliciesPrompt.ts           # Generic comparison prompt
├── 
├── Individual Analysis Prompts:
├── glprompt.ts                        # General Liability
├── proLiabilityprompt.ts             # Professional Liability
├── workersprompt.ts                   # Workers Comp
├── autoprompt.ts                      # Commercial Auto
├── propertyprompt.ts                  # Property
├── cyberLiabilityprompt.ts           # Cyber Liability
├── enviroLiabilityprompt.ts          # Environmental Liability
├── doprompt.ts                        # Directors & Officers
├── 
├── Comparison Prompts:
├── compareLiabilityprompt.ts         # General/Professional Liability
├── compareCyberprompt.ts             # Cyber Liability
├── compareWorkersprompt.ts           # Workers Comp
├── compareAutoprompt.ts              # Commercial Auto
├── comparePropertyprompt.ts          # Property (exists in frontend)
├── compareeplPrompt.ts               # EPL
├── compareEnvironmentalprompt.ts     # Environmental Liability
└── compareDirectorsprompt.ts         # Directors & Officers
```

## ⚙️ **Implementation Code Examples**

### **Frontend Policy Type Selection**
```typescript
// Home.tsx - Document upload modal
<select
  value={documentPolicyType}
  onChange={(e) => setDocumentPolicyType(e.target.value)}
  className="w-full border border-[#d0dee7] rounded px-3 py-2"
>
  {policyTypes.map((type) => (
    <option key={type.value} value={type.value}>
      {type.label} - {type.description}
    </option>
  ))}
</select>
```

### **Backend Document Storage**
```typescript
// routes/documents.ts - Document upload
router.post('/', async (req, res) => {
  const { name, customerId, policyType } = req.body;
  
  const doc = await PolicyDocumentModel.create({
    userId,
    customerId: customerId || null,
    name: assignedName,
    originalName: originalname,
    policyType: policyType || null, // Store policy type metadata
    // ... other fields
  });
});
```

### **AI Service Prompt Selection**
```typescript
// aiService.ts - Prompt selection logic
public async analyzePolicyDocument(documentName: string, policyType: string = 'general-liability') {
  const policySpecificPrompts = {
    'general-liability': glprompt,
    'professional-liability': proLiabilityprompt,
    'workers-comp': workersprompt,
    'commercial-auto': autoprompt,
    'property': propertyprompt,
    'epl': eplPrompt,
    'cyber-liability': cyberLiabilityprompt,
    'environmental-liability': enviroLiabilityprompt,
    'directors-officers': doprompt
  };

  const selectedPrompt = policySpecificPrompts[policyType] || documentAnalysisPrompt;
  return await this.callGeminiAPI(selectedPrompt([documentName]));
}
```

## 🎯 **Specialized Prompt Features**

Each policy type prompt includes:

### **Individual Analysis Prompts**
- **Policy-specific coverage analysis** (e.g., Side A/B/C for D&O)
- **Industry-specific risk factors** (e.g., class codes for Workers Comp)
- **Regulatory compliance requirements** (e.g., state mandates for Workers Comp)
- **Coverage gap identification** tailored to policy type
- **Recommendations** specific to that insurance line

### **Comparison Prompts**
- **Policy renewal comparisons** (expiring vs. renewal)
- **Line-by-line analysis** with 99.9% accuracy target
- **Form and endorsement tracking** with version changes
- **Coverage matrix generation** with confidence ratings
- **Executive summaries** highlighting material differences

## 🔧 **Adding New Policy Types**

To add a new policy type:

1. **Add to frontend dropdown** in `Home.tsx`
2. **Create individual analysis prompt** in `src/prompts/newPolicyPrompt.ts`
3. **Create comparison prompt** in `src/prompts/compareNewPolicyprompt.ts`
4. **Export prompts** in `src/prompts/index.ts`
5. **Update AI service** prompt selection logic
6. **Test with sample documents** of the new policy type

## 📊 **Benefits of This System**

- **Specialized Analysis**: Each insurance line gets tailored analysis focused on its unique coverage areas
- **Industry Expertise**: Prompts incorporate deep insurance industry knowledge
- **Regulatory Compliance**: Policy-specific regulatory requirements are addressed
- **Accuracy**: Specialized prompts provide more accurate and relevant analysis
- **Scalability**: Easy to add new policy types and refine existing prompts
- **Consistency**: Standardized approach across all policy types

This mapping system ensures that every insurance document receives the most appropriate and specialized AI analysis based on its specific policy type and coverage areas. 