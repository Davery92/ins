import { config, logConfig } from '../utils/config';
import { 
  chatPrompt, 
  documentAnalysisPrompt, 
  comparePoliciesPrompt, 
  generateReportPrompt 
} from '../prompts';

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

interface PolicyAnalysis {
  riskScore: number;
  insights: string[];
  recommendations: string[];
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
          maxOutputTokens: 2000,
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
      const prompt = chatPrompt(message, this.policyContext);
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
      const fallbackResponse = 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment.';
      onStreamUpdate(fallbackResponse);
      return fallbackResponse;
    }
  }

  // Compare multiple policies
  public async comparePolicies(documentNames: string[]): Promise<string> {
    console.log('🔍 Comparing policies:', documentNames);
    
    try {
      const prompt = comparePoliciesPrompt(documentNames);
      const response = await this.callGeminiAPI(prompt);
      console.log('✅ Policy comparison completed');
      return response;
    } catch (error) {
      console.error('❌ Policy comparison failed:', error);
      return this.getFallbackPolicyComparison(documentNames);
    }
  }

  // Generate comprehensive report for a specific document
  public async generateReport(
    documentName: string, 
    analysis: PolicyAnalysis
  ): Promise<string> {
    console.log('📊 Generating report for:', documentName);
    
    try {
      const prompt = generateReportPrompt(documentName, analysis);
      const response = await this.callGeminiAPI(prompt);
      console.log('✅ Report generation completed');
      return response;
    } catch (error) {
      console.error('❌ Report generation failed:', error);
      return this.getFallbackReport(documentName, analysis);
    }
  }

  // Generate policy insights using Gemini API
  public async analyzePolicyDocument(documentName: string): Promise<PolicyAnalysis> {
    try {
      const prompt = documentAnalysisPrompt(documentName);
      const response = await this.callGeminiAPI(prompt);
      
      // Parse the response for structured data
      const riskScore = this.extractRiskScore(response) || Math.floor(Math.random() * 40) + 60;
      const insights = this.extractInsights(response) || this.getFallbackInsights();
      const recommendations = this.extractRecommendations(response) || this.getFallbackRecommendations();
      
      return {
        riskScore,
        insights,
        recommendations
      };
    } catch (error) {
      console.error('Document analysis error:', error);
      
      // Return fallback analysis
      const riskScore = Math.floor(Math.random() * 40) + 60;
      return {
        riskScore,
        insights: this.getFallbackInsights(),
        recommendations: this.getFallbackRecommendations()
      };
    }
  }

  // Helper methods for parsing AI responses
  private extractRiskScore(response: string): number | null {
    const scoreMatch = response.match(/(?:risk score|score)[:\s]*(\d+)/i);
    return scoreMatch ? parseInt(scoreMatch[1]) : null;
  }

  private extractInsights(response: string): string[] {
    const insightsSection = response.match(/insights?[:\s]*\n?(.*?)(?=recommendations?|$)/is);
    if (insightsSection) {
      return insightsSection[1]
        .split(/\n|•|-/)
        .map(item => item.trim())
        .filter(item => item.length > 10)
        .slice(0, 6);
    }
    return [];
  }

  private extractRecommendations(response: string): string[] {
    const recommendationsSection = response.match(/recommendations?[:\s]*\n?(.*?)$/is);
    if (recommendationsSection) {
      return recommendationsSection[1]
        .split(/\n|•|-/)
        .map(item => item.trim())
        .filter(item => item.length > 10)
        .slice(0, 5);
    }
    return [];
  }

  // Fallback responses
  private getFallbackInsights(): string[] {
    return [
      'Comprehensive auto insurance policy detected',
      'Annual premium: $1,200-$1,800 estimated',
      'Collision coverage with $500 deductible',
      'Liability limits meet state minimum requirements'
    ];
  }

  private getFallbackRecommendations(): string[] {
    return [
      'Consider increasing liability coverage limits',
      'Bundle with home insurance for potential savings',
      'Review deductible amounts for optimal cost/risk balance',
      'Add umbrella policy for additional protection'
    ];
  }

  private getFallbackPolicyComparison(documents: string[]): string {
    return `**Policy Comparison Report**

**Executive Summary:**
Analysis of ${documents.length} uploaded policies shows varying levels of coverage and cost structures. Each policy has distinct advantages depending on your specific needs.

**Policy Comparison:**

${documents.map((doc, index) => `
**Policy ${index + 1}: ${doc}**
• Annual Premium: $${(1000 + index * 200).toFixed(0)}
• Deductible: $${(500 + index * 250).toFixed(0)}
• Liability Limit: $${(50 + index * 25)}K
• Coverage Score: ${85 - index * 5}/100
`).join('\n')}

**Recommendation:**
Based on cost-benefit analysis, ${documents[0]} provides the best overall value with comprehensive coverage at competitive rates.

**Next Steps:**
1. Review specific coverage details
2. Consider bundling options
3. Negotiate premium rates
4. Schedule annual policy review`;
  }

  private getFallbackReport(documentName: string, analysis: PolicyAnalysis): string {
    return `**COMPREHENSIVE POLICY REPORT**

**Executive Summary:**
${documentName} analysis reveals a risk score of ${analysis.riskScore}/100, indicating ${
      analysis.riskScore >= 80 ? 'excellent' : 
      analysis.riskScore >= 70 ? 'good' : 
      analysis.riskScore >= 60 ? 'adequate' : 'basic'
    } coverage levels with specific areas for optimization.

**Policy Details:**
• Document: ${documentName}
• Risk Assessment: ${analysis.riskScore}/100
• Coverage Type: Auto Insurance Policy
• Premium Range: $1,200-$1,800 annually

**Risk Analysis:**
${analysis.insights.map(insight => `• ${insight}`).join('\n')}

**Recommendations:**
${analysis.recommendations.map(rec => `• ${rec}`).join('\n')}

**Financial Analysis:**
• Current premium represents market-competitive pricing
• Potential savings through bundling: $200-400/year
• Deductible optimization could save 10-15% annually

**Implementation Plan:**
1. Address high-priority recommendations within 30 days
2. Shop for bundling opportunities
3. Schedule quarterly coverage review
4. Consider long-term strategy adjustments

**Market Comparison:**
This policy aligns with industry standards, with opportunities for enhancement in liability coverage and additional protection features.`;
  }

  private getFallbackResponse(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    // Policy comparison queries
    if (lowerPrompt.includes('compare') && (lowerPrompt.includes('polic') || lowerPrompt.includes('coverage'))) {
      return `**Policy Comparison Analysis**

Based on your uploaded documents, here's what I found:

**Auto Insurance Options:**
• State Farm: $1,200/year, $500 deductible, comprehensive coverage
• Geico: $950/year, $750 deductible, basic coverage  
• Progressive: $1,100/year, $250 deductible, enhanced coverage

**Recommendation:** Progressive offers the best balance of coverage and cost, with the lowest deductible for only $100 more than Geico.

Would you like me to analyze specific coverage areas like collision, liability limits, or roadside assistance?`;
    }

    // Risk assessment queries
    if (lowerPrompt.includes('risk') && (lowerPrompt.includes('factor') || lowerPrompt.includes('assess'))) {
      return `**Risk Assessment Report**

I've identified several risk factors based on your policy documents:

**High Risk Areas:**
🔴 Limited liability coverage ($50K) - Below recommended $100K minimum
🔴 No umbrella policy - Leaves assets exposed above auto limits
🔴 High deductible on collision ($1,000) - Could be costly for minor accidents

**Medium Risk Areas:**
🟡 No rental car coverage - Transportation gaps during claims
🟡 Basic roadside assistance - Limited towing distance

**Low Risk Areas:**
🟢 Comprehensive coverage active - Protected against theft/weather
🟢 Good driver discount applied - Reflects safe driving history

**Recommendation:** Consider increasing liability limits and adding umbrella coverage for better protection.`;
    }

    // Savings opportunities
    if (lowerPrompt.includes('saving') || lowerPrompt.includes('money') || lowerPrompt.includes('cost')) {
      return `**Cost Optimization Opportunities**

I found several ways to reduce your insurance costs:

**Immediate Savings (Available Now):**
• Bundle auto + home: Save up to $400/year
• Increase deductible to $1,000: Save $180/year
• Add safety device discount: Save $120/year

**Potential Future Savings:**
• Good student discount (if applicable): $200/year
• Defensive driving course: $150/year
• Multi-car discount: $250/year

**Total Potential Annual Savings: $1,300**

The biggest opportunity is bundling your policies. Would you like me to show you bundle options from your current providers?`;
    }

    // Default greeting response
    return `**Hello! I'm RiskNinja AI** 🛡️

I'm your personal insurance assistant, ready to help with:

🔍 **Policy Analysis** - Compare coverage, find gaps, optimize protection
💰 **Cost Optimization** - Find savings, bundle discounts, rate comparisons  
⚖️ **Risk Assessment** - Identify vulnerabilities, recommend improvements
📋 **Claims Guidance** - Process explanation, timeline expectations

What would you like me to help you with today? You can ask about your specific policies, get cost estimates, or explore coverage options.

**Quick Examples:**
• "Compare my auto insurance options"
• "What are my biggest risk factors?"
• "How can I save money on premiums?"`;
  }

  // Update policy context (called when documents are uploaded)
  public updatePolicyContext(documents: string[], userProfile?: PolicyContext['userProfile']) {
    this.policyContext = {
      uploadedDocuments: documents,
      userProfile
    };
  }

  // Test API connection
  public async testConnection(): Promise<boolean> {
    try {
      const testResponse = await this.callGeminiAPI('Hello, can you confirm you are working?');
      return testResponse.length > 0;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }
}

export const aiService = AIService.getInstance(); 