import { config, logConfig } from '../utils/config';

interface PolicyContext {
  uploadedDocuments: string[];
  userProfile?: {
    age?: number;
    location?: string;
    riskFactors?: string[];
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export class AIService {
  private static instance: AIService;
  private policyContext: PolicyContext = { uploadedDocuments: [] };
  private readonly apiKey: string;
  private readonly modelId: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = config.gemini.apiKey;
    this.modelId = config.gemini.modelId;
    this.baseUrl = `${config.gemini.baseUrl}/${this.modelId}:generateContent?key=${this.apiKey}`;
    
    // Log configuration in development
    logConfig();
    
    if (!this.apiKey) {
      console.warn('⚠️ Gemini API key not found. Using fallback mock responses.');
      console.warn('Make sure REACT_APP_GEMINI_API_KEY is set in your .env file');
    } else {
      console.log('✅ Gemini API key loaded successfully');
      console.log('🔗 API URL:', this.baseUrl.replace(this.apiKey, '***'));
    }
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  // Build context-aware prompt for insurance domain
  private buildInsurancePrompt(userMessage: string): string {
    const systemContext = `You are RiskNinja AI, a specialized commercial insurance assistant. You help businesses with:
- Commercial policy analysis and risk assessment
- Coverage gap identification and recommendations  
- Premium optimization and cost management
- Claims guidance and risk mitigation strategies
- Regulatory compliance and industry best practices

Context about the business:
- Has uploaded ${this.policyContext.uploadedDocuments.length} commercial policy documents: ${this.policyContext.uploadedDocuments.join(', ')}
- Looking for commercial insurance advice and analysis
- Documents may include: General Liability, Commercial Property, Workers Comp, Professional Liability, Cyber Liability, Commercial Auto, Business Interruption, D&O coverage

Respond in a professional, business-focused tone. Use industry terminology appropriately and format responses with clear headers using **bold** text. 
Provide specific, actionable recommendations with dollar amounts and coverage limits when possible.
Focus on business risk management and regulatory compliance.

User question: ${userMessage}`;

    return systemContext;
  }

  // Call Gemini API
  private async callGeminiAPI(prompt: string): Promise<string> {
    if (!this.apiKey) {
      console.log('🔄 No API key, using fallback response');
      return this.getFallbackResponse(prompt);
    }

    console.log('🚀 Making Gemini API call...');
    console.log('📝 Prompt length:', prompt.length);

    try {
      const requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95
        }
      };

      console.log('📤 Sending request to:', this.baseUrl.replace(this.apiKey, '***'));

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: GeminiResponse = await response.json();
      console.log('✅ API response received, candidates:', data.candidates?.length);
      
      if (data.candidates && data.candidates.length > 0 && data.candidates[0].content.parts.length > 0) {
        const responseText = data.candidates[0].content.parts[0].text;
        console.log('🎯 AI Response length:', responseText.length);
        return responseText;
      } else {
        console.error('❌ No response content from Gemini API:', data);
        throw new Error('No response content from Gemini API');
      }
    } catch (error) {
      console.error('❌ Gemini API call failed:', error);
      console.log('🔄 Falling back to mock response');
      return this.getFallbackResponse(prompt);
    }
  }

  // Simulate streaming AI response with real API
  public async sendMessage(
    message: string,
    onStreamUpdate: (content: string) => void
  ): Promise<string> {
    try {
      const prompt = this.buildInsurancePrompt(message);
      const response = await this.callGeminiAPI(prompt);
      
      // Simulate streaming by sending chunks
      const words = response.split(' ');
      let currentContent = '';
      
      for (let i = 0; i < words.length; i++) {
        currentContent += (i > 0 ? ' ' : '') + words[i];
        onStreamUpdate(currentContent);
        
        // Simulate network delay for streaming effect
        await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 70));
      }
      
      return response;
    } catch (error) {
      console.error('AI service error:', error);
      const fallbackResponse = 'The model is currently unavailable. Please try again later.';
      onStreamUpdate(fallbackResponse);
      return fallbackResponse;
    }
  }

  // Fallback when the model is unavailable
  private getFallbackResponse(prompt: string): string {
    return 'The model is currently unavailable. Please try again later.';
  }

  // Update policy context (called when documents are uploaded)
  public updatePolicyContext(documents: string[], userProfile?: PolicyContext['userProfile']) {
    this.policyContext = {
      uploadedDocuments: documents,
      userProfile
    };
  }

  // Generate policy insights using Gemini API
  public async analyzePolicyDocument(documentName: string, policyType: string = 'general-liability'): Promise<{
    riskScore: number;
    insights: string[];
    recommendations: string[];
    extractedText?: string;
    summary?: string;
    keyTerms?: string[];
  }> {
    console.log(`🤖 Analyzing ${policyType} policy document:`, documentName);

    // Simulate document text extraction
    const extractedText = this.simulateTextExtraction(documentName, policyType);
    const summary = this.generateDocumentSummary(extractedText, policyType);
    const keyTerms = this.extractKeyTerms(extractedText, policyType);

    // Create policy-type specific analysis prompt
    const policySpecificPrompts = {
      'general-liability': "Focus on per-occurrence and aggregate limits, product liability exclusions, premises liability coverage, personal injury protection, and advertising injury coverage.",
      'commercial-property': "Focus on building coverage limits, business personal property, replacement cost vs actual cash value, business interruption coverage, and covered perils including natural disasters.",
      'workers-comp': "Focus on class code coverage, experience modification factors, return-to-work programs, independent contractor coverage, and state compliance requirements.",
      'professional-liability': "Focus on errors and omissions coverage limits, prior acts coverage, defense costs coverage, regulatory proceedings coverage, and industry-specific exclusions.",
      'cyber-liability': "Focus on data breach response costs, network security liability, cyber extortion coverage, business interruption due to cyber events, and regulatory fines coverage.",
      'commercial-auto': "Focus on liability limits, physical damage coverage, hired and non-owned auto coverage, fleet safety programs, and cargo coverage for business goods.",
      'business-interruption': "Focus on business income coverage period, extra expense coverage, contingent business interruption, civil authority coverage, and waiting period requirements.",
      'directors-officers': "Focus on Side A, B, and C coverage differences, entity vs individual coverage, employment practices liability, fiduciary liability, and defense cost coverage."
    };

    const analysisPrompt = `Analyze this ${policyType} commercial insurance policy document: "${documentName}".

Extracted text summary: ${summary}

${policySpecificPrompts[policyType as keyof typeof policySpecificPrompts] || "Focus on key commercial coverage areas, policy limits, deductibles, exclusions, and overall business protection scope."}

Provide analysis specific to ${policyType} commercial insurance policies including business risk assessment, coverage gaps, and recommendations for improvement.`;

    if (!this.apiKey) {
      console.log('🔄 No API key, using fallback policy analysis');
      const fallbackAnalysis = this.getFallbackPolicyAnalysis(policyType);
      return {
        ...fallbackAnalysis,
        extractedText,
        summary,
        keyTerms
      };
    }

    try {
      const response = await this.callGeminiAPI(analysisPrompt);
      const parsedAnalysis = this.parsePolicyAnalysis(response, policyType);
      return {
        ...parsedAnalysis,
        extractedText,
        summary,
        keyTerms
      };
    } catch (error) {
      console.error('❌ Policy analysis failed:', error);
      const fallbackAnalysis = this.getFallbackPolicyAnalysis(policyType);
      return {
        ...fallbackAnalysis,
        extractedText,
        summary,
        keyTerms
      };
    }
  }

  // Simulate realistic document text extraction
  private simulateTextExtraction(documentName: string, policyType: string): string {
    const companyName = this.extractCompanyFromFilename(documentName);
    const policyNumber = `CP-${Math.floor(Math.random() * 900000 + 100000)}`;
    const effectiveDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
    const expirationDate = new Date(effectiveDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    const baseText = `COMMERCIAL INSURANCE POLICY

Policy Number: ${policyNumber}
Named Insured: ${companyName}
Policy Period: ${effectiveDate.toLocaleDateString()} to ${expirationDate.toLocaleDateString()}

COVERAGE SUMMARY:
This policy provides commercial insurance coverage for the named insured's business operations.

DECLARATIONS:
- Business Description: ${this.getBusinessDescription(policyType)}
- Location: 123 Business Ave, Commerce City, ST 12345
- Policy Territory: United States and Canada

LIMITS OF INSURANCE:
${this.getPolicyLimits(policyType)}

DEDUCTIBLES:
${this.getPolicyDeductibles(policyType)}

PREMIUM INFORMATION:
Annual Premium: $${Math.floor(Math.random() * 5000 + 2000)}
Payment Terms: Annual

ENDORSEMENTS:
${this.getPolicyEndorsements(policyType)}

CONDITIONS:
This policy is subject to all terms, conditions, and exclusions set forth herein.
Coverage is provided only for claims that occur during the policy period.
All claims must be reported promptly to the insurer.

EXCLUSIONS:
${this.getPolicyExclusions(policyType)}

Authorized Representative: Insurance Agent
Date Issued: ${new Date().toLocaleDateString()}`;

    return baseText;
  }

  private extractCompanyFromFilename(filename: string): string {
    const baseName = filename.toLowerCase().replace(/\.(pdf|doc|docx)$/i, '');
    
    // Extract potential company names from filename
    if (baseName.includes('acme')) return 'Acme Corporation';
    if (baseName.includes('tech')) return 'TechCorp Solutions LLC';
    if (baseName.includes('construction')) return 'Premier Construction Inc.';
    if (baseName.includes('medical')) return 'HealthCare Partners LLC';
    if (baseName.includes('retail')) return 'Retail Dynamics Corp';
    if (baseName.includes('manufacturing')) return 'Manufacturing Solutions Inc.';
    
    // Default company name
    const words = baseName.split(/[_-\s]+/).filter(w => w.length > 2);
    const companyName = words.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return `${companyName} LLC` || 'Business Enterprise LLC';
  }

  private getBusinessDescription(policyType: string): string {
    const descriptions = {
      'general-liability': 'Professional services and consulting',
      'commercial-property': 'Office building and equipment rental',
      'workers-comp': 'Manufacturing and warehouse operations',
      'professional-liability': 'Technology consulting and software development',
      'cyber-liability': 'Data processing and technology services',
      'commercial-auto': 'Transportation and delivery services',
      'business-interruption': 'Retail and wholesale operations',
      'directors-officers': 'Corporate management and financial services'
    };
    return descriptions[policyType as keyof typeof descriptions] || 'General business operations';
  }

  private getPolicyLimits(policyType: string): string {
    const limits = {
      'general-liability': `General Aggregate: $2,000,000
Products/Completed Operations Aggregate: $2,000,000
Each Occurrence: $1,000,000
Personal & Advertising Injury: $1,000,000
Medical Expenses: $10,000`,
      'commercial-property': `Building: $500,000
Business Personal Property: $250,000
Business Income: $100,000/month (12 months max)
Extra Expense: $50,000`,
      'workers-comp': `Workers Compensation: Statutory Limits
Employers Liability:
- Bodily Injury by Accident: $1,000,000
- Bodily Injury by Disease: $1,000,000
- Bodily Injury by Disease (Policy Limit): $1,000,000`,
      'professional-liability': `Each Claim: $1,000,000
Aggregate: $3,000,000
Deductible: $5,000`,
      'cyber-liability': `Data Breach Response: $500,000
Cyber Extortion: $100,000
Business Interruption: $250,000
Network Security Liability: $1,000,000`,
      'commercial-auto': `Combined Single Limit: $1,000,000
Uninsured/Underinsured Motorists: $1,000,000
Medical Payments: $5,000
Comprehensive/Collision: Actual Cash Value`,
    };
    return limits[policyType as keyof typeof limits] || 'Coverage limits as specified in declarations';
  }

  private getPolicyDeductibles(policyType: string): string {
    const deductibles = {
      'general-liability': 'None',
      'commercial-property': '$1,000 per occurrence',
      'workers-comp': 'None',
      'professional-liability': '$5,000 per claim',
      'cyber-liability': '$2,500 per occurrence',
      'commercial-auto': 'Comprehensive: $500, Collision: $1,000',
    };
    return deductibles[policyType as keyof typeof deductibles] || '$1,000 per occurrence';
  }

  private getPolicyEndorsements(policyType: string): string {
    const endorsements = {
      'general-liability': '• Additional Insured - Customers\n• Waiver of Subrogation\n• Primary and Non-Contributory',
      'commercial-property': '• Equipment Breakdown\n• Ordinance or Law Coverage\n• Business Income from Dependent Properties',
      'workers-comp': '• Waiver of Subrogation\n• Alternate Employer\n• Independent Contractors',
      'professional-liability': '• Network Security Liability\n• Regulatory Proceedings\n• Public Relations Expenses',
      'cyber-liability': '• Social Engineering\n• Funds Transfer Fraud\n• Telecommunication Fraud',
      'commercial-auto': '• Hired Auto Physical Damage\n• Employee Non-Ownership\n• Drive Other Car Coverage',
    };
    return endorsements[policyType as keyof typeof endorsements] || 'Standard policy endorsements apply';
  }

  private getPolicyExclusions(policyType: string): string {
    const exclusions = {
      'general-liability': '• Nuclear Energy Liability\n• War and Military Action\n• Professional Services\n• Cyber Incidents',
      'commercial-property': '• Flood\n• Earthquake\n• Nuclear Hazard\n• Governmental Action\n• Neglect',
      'workers-comp': '• Injury to owners/partners\n• Violation of law by insured\n• Deliberate intention to cause injury',
      'professional-liability': '• Bodily injury or property damage\n• Criminal acts\n• Prior knowledge of circumstances',
      'cyber-liability': '• War and terrorism\n• Infrastructure failures\n• Patent/trademark infringement',
      'commercial-auto': '• Racing\n• Livery/ride-sharing\n• Nuclear energy\n• War and confiscation',
    };
    return exclusions[policyType as keyof typeof exclusions] || 'Standard policy exclusions apply';
  }

  private generateDocumentSummary(extractedText: string, policyType: string): string {
    const summaries = {
      'general-liability': 'Commercial general liability policy providing coverage for third-party bodily injury and property damage claims arising from business operations.',
      'commercial-property': 'Commercial property insurance covering building, business personal property, and business income losses from covered perils.',
      'workers-comp': 'Workers compensation insurance providing medical benefits and wage replacement for work-related injuries and illnesses.',
      'professional-liability': 'Professional liability insurance protecting against claims of errors, omissions, and negligent acts in professional services.',
      'cyber-liability': 'Cyber liability insurance covering data breaches, network security incidents, and related business interruption losses.',
      'commercial-auto': 'Commercial auto policy providing liability and physical damage coverage for business vehicles and fleet operations.',
      'business-interruption': 'Business interruption insurance covering lost income and extra expenses during covered property damage events.',
      'directors-officers': 'Directors and officers liability insurance protecting executives against claims arising from management decisions.'
    };
    
    return summaries[policyType as keyof typeof summaries] || 'Commercial insurance policy providing business protection coverage.';
  }

  private extractKeyTerms(extractedText: string, policyType: string): string[] {
    const keyTerms = {
      'general-liability': ['Occurrence', 'Aggregate Limit', 'Products Liability', 'Premises Liability', 'Personal Injury', 'Advertising Injury'],
      'commercial-property': ['Replacement Cost', 'Actual Cash Value', 'Business Income', 'Extra Expense', 'Coinsurance', 'Ordinance or Law'],
      'workers-comp': ['Experience Modification', 'Class Code', 'Statutory Benefits', 'Return to Work', 'Independent Contractor'],
      'professional-liability': ['Errors and Omissions', 'Prior Acts', 'Claims Made', 'Defense Costs', 'Regulatory Proceedings'],
      'cyber-liability': ['Data Breach', 'Network Security', 'Privacy Liability', 'Cyber Extortion', 'Business Interruption'],
      'commercial-auto': ['Hired Auto', 'Non-Owned Auto', 'Physical Damage', 'Medical Payments', 'Uninsured Motorist'],
      'business-interruption': ['Period of Restoration', 'Waiting Period', 'Civil Authority', 'Contingent Business Income'],
      'directors-officers': ['Side A', 'Side B', 'Side C', 'Employment Practices', 'Fiduciary Liability', 'Entity Coverage']
    };
    
    return keyTerms[policyType as keyof typeof keyTerms] || ['Policy Terms', 'Coverage Limits', 'Deductibles', 'Exclusions'];
  }

  // Test API connection without network call: check if API key is present
  public async testConnection(): Promise<boolean> {
    return Promise.resolve(!!this.apiKey);
  }

  private getFallbackPolicyAnalysis(policyType: string): {
    riskScore: number;
    insights: string[];
    recommendations: string[];
  } {
    const riskScore = Math.floor(Math.random() * 40) + 60; // 60-100
    
    const fallbackData = {
      'general-liability': {
        insights: [
          'General liability policy detected',
          `Annual premium: $${(Math.random() * 2000 + 2000).toFixed(0)}`,
          'Per-occurrence limit: $1,000,000',
          'Aggregate limit: $2,000,000',
          'Product liability coverage included'
        ],
        recommendations: [
          riskScore < 70 ? 'Consider increasing aggregate limits to $3M' : 'Adequate aggregate protection in place',
          riskScore < 80 ? 'Add umbrella policy for excess liability' : 'Good primary liability protection',
          'Review product liability exclusions',
          'Consider cyber liability endorsement'
        ]
      },
      'commercial-property': {
        insights: [
          'Commercial property policy analyzed',
          `Annual premium: $${(Math.random() * 3000 + 2500).toFixed(0)}`,
          'Replacement cost coverage confirmed',
          'Business personal property included',
          'Business interruption endorsement active'
        ],
        recommendations: [
          riskScore < 70 ? 'Consider increasing building coverage limits' : 'Adequate building protection',
          riskScore < 80 ? 'Add equipment breakdown coverage' : 'Good equipment protection in place',
          'Review natural disaster coverage',
          'Consider extended business interruption period'
        ]
      },
      'workers-comp': {
        insights: [
          'Workers compensation policy reviewed',
          `Annual premium: $${(Math.random() * 5000 + 3000).toFixed(0)}`,
          'Experience modification factor: 0.95',
          'Return-to-work program included',
          'All employee classifications covered'
        ],
        recommendations: [
          riskScore < 70 ? 'Implement enhanced safety training program' : 'Good safety record maintained',
          riskScore < 80 ? 'Review independent contractor coverage' : 'Contractor coverage adequate',
          'Consider managed care network',
          'Evaluate experience mod improvement strategies'
        ]
      },
      'professional-liability': {
        insights: [
          'Professional liability coverage confirmed',
          `Annual premium: $${(Math.random() * 2500 + 1500).toFixed(0)}`,
          'Coverage limit: $1,000,000 per claim',
          'Prior acts coverage included',
          'Defense costs outside limits'
        ],
        recommendations: [
          riskScore < 70 ? 'Consider increasing coverage to $2M' : 'Coverage limits appropriate for risk',
          riskScore < 80 ? 'Add cyber professional liability' : 'Good technology E&O protection',
          'Review industry-specific exclusions',
          'Consider regulatory proceedings coverage'
        ]
      },
      'cyber-liability': {
        insights: [
          'Cyber liability policy detected',
          `Annual premium: $${(Math.random() * 1500 + 800).toFixed(0)}`,
          'Data breach response coverage: $500,000',
          'Network security liability included',
          'Business interruption cyber coverage active'
        ],
        recommendations: [
          riskScore < 70 ? 'Increase data breach coverage to $1M' : 'Adequate breach response coverage',
          riskScore < 80 ? 'Add social engineering coverage' : 'Good fraud protection in place',
          'Review cyber security training requirements',
          'Consider regulatory fines coverage'
        ]
      },
      'commercial-auto': {
        insights: [
          'Commercial auto policy reviewed',
          `Annual premium: $${(Math.random() * 4000 + 2000).toFixed(0)}`,
          'Fleet liability: $1M combined single limit',
          'Hired and non-owned coverage included',
          'Fleet safety program discount applied'
        ],
        recommendations: [
          riskScore < 70 ? 'Consider higher liability limits' : 'Liability limits adequate for fleet size',
          riskScore < 80 ? 'Add motor truck cargo coverage' : 'Good cargo protection in place',
          'Review driver qualification standards',
          'Consider telematics program for additional savings'
        ]
      }
    };

    const typeData = fallbackData[policyType as keyof typeof fallbackData] || {
      insights: [
        'Commercial insurance policy uploaded',
        'Standard business coverage terms detected',
        'Policy appears to be in good standing',
        'Coverage details extracted for review'
      ],
      recommendations: [
        'Schedule comprehensive policy review',
        'Compare with market alternatives',
        'Evaluate coverage adequacy for business size',
        'Review deductible optimization opportunities'
      ]
    };

    return {
      riskScore,
      insights: typeData.insights,
      recommendations: typeData.recommendations
    };
  }

  private parsePolicyAnalysis(response: string, policyType: string): {
    riskScore: number;
    insights: string[];
    recommendations: string[];
  } {
    // For now, return structured fallback analysis
    // In the future, this would parse the AI response
    return this.getFallbackPolicyAnalysis(policyType);
  }

  /**
   * Send a raw prompt directly to the AI, streaming responses without additional context.
   */
  public async sendRawPrompt(
    rawPrompt: string,
    onStreamUpdate: (content: string) => void
  ): Promise<string> {
    try {
      // Directly call Gemini API with the provided prompt
      const response = await this.callGeminiAPI(rawPrompt);
      // Stream full response immediately without delay
      onStreamUpdate(response);
      return response;
    } catch (error) {
      console.error('Raw prompt AI service error:', error);
      const fallback = 'I apologize, but I cannot complete that request right now.';
      onStreamUpdate(fallback);
      return fallback;
    }
  }
}

export const aiService = AIService.getInstance(); 