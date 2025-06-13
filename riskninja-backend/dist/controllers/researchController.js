"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResearchReport = void 0;
const aiService_1 = require("../services/aiService");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Crawler = require('simplecrawler');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cheerio = require('cheerio');
const html_to_text_1 = require("html-to-text");
const tiktoken_1 = require("@dqbd/tiktoken");
// Function to optimize and truncate content to fit token limits
const optimizeContent = (content, maxTokens = 800000) => {
    const encoder = (0, tiktoken_1.get_encoding)('cl100k_base');
    try {
        // First, clean up the content
        let optimized = content
            // Remove excessive whitespace
            .replace(/\s+/g, ' ')
            // Remove empty lines
            .replace(/\n\s*\n/g, '\n')
            // Remove repeated patterns that don't add value
            .replace(/(\s*\.{3,}\s*)/g, ' ')
            // Remove excessive punctuation
            .replace(/[!]{2,}/g, '!')
            .replace(/[?]{2,}/g, '?')
            // Trim start and end
            .trim();
        // Check token count
        let tokenIds = encoder.encode(optimized);
        if (tokenIds.length > maxTokens) {
            console.log(`Content token count (${tokenIds.length}) exceeds limit (${maxTokens}), truncating...`);
            // Truncate to fit within token limit
            tokenIds = tokenIds.slice(0, maxTokens);
            optimized = new TextDecoder().decode(encoder.decode(tokenIds));
            // Try to end at a sentence boundary
            const lastSentence = optimized.lastIndexOf('.');
            if (lastSentence > optimized.length * 0.8) {
                optimized = optimized.substring(0, lastSentence + 1);
            }
            console.log(`Content truncated to ${encoder.encode(optimized).length} tokens`);
        }
        return optimized;
    }
    finally {
        encoder.free();
    }
};
// Function to find specific pages (services, about, contact, home)
const findTargetPages = async (baseUrl) => {
    return new Promise((resolve, reject) => {
        const crawler = new Crawler(baseUrl);
        crawler.maxDepth = 2; // Go a bit deeper to find target pages
        crawler.maxConcurrency = 3;
        const targetPages = [];
        let pageCount = 0;
        const maxPages = 20; // Increased to find target pages
        // Define target page patterns
        const targetPatterns = {
            home: /^(\/|\/home|\/index|\/main)?(\?.*)?$/i,
            about: /\/(about|company|who-we-are|our-company|mission|vision|team)/i,
            services: /\/(services|solutions|products|offerings|what-we-do|capabilities)/i,
            contact: /\/(contact|get-in-touch|reach-us|contact-us|support)/i
        };
        // Safety guard: stop after 20 seconds
        const crawlTimeout = setTimeout(() => {
            crawler.stop();
            resolve(targetPages);
        }, 20 * 1000);
        crawler.on('fetchcomplete', (queueItem, data) => {
            pageCount++;
            const url = queueItem.url;
            const urlPath = new URL(url).pathname;
            // Determine page type
            let pageType = 'other';
            for (const [type, pattern] of Object.entries(targetPatterns)) {
                if (pattern.test(urlPath)) {
                    pageType = type;
                    break;
                }
            }
            // Always include home page and target pages
            if (pageType !== 'other' || url === baseUrl || urlPath === '/' || urlPath === '') {
                targetPages.push({
                    url,
                    html: data.toString(),
                    pageType: pageType === 'other' ? 'home' : pageType
                });
                console.log(`Found target page: ${pageType} - ${url}`);
            }
            // Stop crawling if we've reached the page limit
            if (pageCount >= maxPages) {
                crawler.stop();
                resolve(targetPages);
            }
        });
        crawler.on('complete', () => {
            clearTimeout(crawlTimeout);
            resolve(targetPages);
        });
        ['fetcherror', 'fetchtimeout', 'fetchclienterror'].forEach(evt => crawler.on(evt, () => { }));
        crawler.start();
    });
};
// Underwriting prompt function
const getUnderwritingPrompt = (scrapedContent, additionalText, documentContent, companyUrl) => {
    const companyName = new URL(companyUrl).hostname.replace(/^www\./, '').replace(/\..+$/, '');
    return `
# UNDERWRITING RESEARCH AND ANALYSIS REQUEST

## OBJECTIVE
Conduct a comprehensive underwriting analysis of ${companyName} following the systematic framework for identifying critical risk factors that generate maximum functional understanding for underwriting decisions.

## ENTITY INFORMATION
**Company:** ${companyName}
**Website:** ${companyUrl}

## AVAILABLE DATA SOURCES

### SCRAPED WEBSITE CONTENT
${scrapedContent}

### ADDITIONAL CONTEXT PROVIDED
${additionalText || 'No additional context provided'}

### SUPPORTING DOCUMENTS
${documentContent || 'No supporting documents provided'}

## ANALYSIS REQUIREMENTS

Based on the underwriting framework, please provide a comprehensive analysis that includes:

### 1. ENTITY OVERVIEW
- Core business operations and activities
- Industry classification and market position
- Key business model characteristics
- Geographic scope of operations

### 2. CRITICAL RISK IDENTIFICATION (The Vital 20%)
Identify and analyze the critical 20% of risk factors that will drive 80% of the underwriting decision:
- **Primary Risk Exposures:** Most significant sources of potential loss
- **Secondary Risk Factors:** Supporting risks that could amplify primary exposures
- **Operational Risk Indicators:** Day-to-day business risks
- **Financial Risk Signals:** Revenue stability, cash flow, growth patterns
- **Regulatory/Compliance Risks:** Industry-specific regulatory requirements

### 3. RISK DENSITY ANALYSIS
For each identified critical risk:
- **Severity Potential:** Maximum possible impact
- **Frequency Likelihood:** Probability of occurrence
- **Control Environment:** Existing risk management practices
- **Trend Analysis:** Whether risks are increasing, stable, or decreasing

### 4. UNDERWRITING IMPLICATIONS
- **Coverage Recommendations:** Types of insurance coverage most relevant
- **Coverage Limits:** Suggested coverage amounts based on exposure analysis
- **Deductible Considerations:** Appropriate retention levels
- **Exclusions/Restrictions:** Areas requiring special attention or limitations
- **Premium Considerations:** Factors that would influence pricing

### 5. RED FLAGS AND CONCERNS
- **Immediate Concerns:** Issues requiring immediate attention
- **Emerging Risks:** Potential future risk developments
- **Information Gaps:** Areas where additional information is needed
- **Decline Considerations:** Factors that might make the risk unacceptable

### 6. RISK MITIGATION OPPORTUNITIES
- **Loss Control Recommendations:** Steps the company could take to reduce risk
- **Risk Transfer Options:** Alternative risk financing approaches
- **Monitoring Requirements:** Ongoing risk assessment needs

### 7. COMPETITIVE AND INDUSTRY CONTEXT
- **Industry Risk Benchmarks:** How this entity compares to industry peers
- **Market Trends:** Relevant industry developments affecting risk profile
- **Regulatory Environment:** Current and anticipated regulatory changes

### 8. UNDERWRITING DECISION FRAMEWORK
- **Accept/Decline Recommendation:** Based on current information
- **Conditional Acceptance Criteria:** What would need to change for approval
- **Follow-up Requirements:** Additional information or documentation needed
- **Review Schedule:** When the risk should be reassessed

## OUTPUT FORMAT
Please structure your response as a comprehensive underwriting report that follows the above framework. Use clear headings, bullet points for key findings, and provide specific, actionable insights that would enable an underwriter to make informed decisions about this risk.

Focus on delivering the critical 20% of insights that will drive 80% of the underwriting value, as specified in the underwriting framework methodology.
`;
};
const generateResearchReport = async (req, res) => {
    const { url, additionalText, documents } = req.body;
    if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
    }
    try {
        console.log(`Starting underwriting research for: ${url}`);
        // Find and scrape target pages
        const targetPages = await findTargetPages(url);
        if (targetPages.length === 0) {
            res.status(400).json({ error: 'Unable to scrape any content from the provided URL' });
            return;
        }
        console.log(`Found ${targetPages.length} target pages`);
        // Extract and organize content by page type
        const pageContents = {};
        for (const page of targetPages) {
            const textContent = (0, html_to_text_1.htmlToText)(page.html, {
                wordwrap: false,
                selectors: [
                    { selector: 'nav', format: 'skip' },
                    { selector: 'header', format: 'skip' },
                    { selector: 'footer', format: 'skip' },
                    { selector: '.navigation', format: 'skip' },
                    { selector: '.menu', format: 'skip' },
                    { selector: '.sidebar', format: 'skip' },
                    { selector: 'script', format: 'skip' },
                    { selector: 'style', format: 'skip' }
                ]
            });
            if (!pageContents[page.pageType]) {
                pageContents[page.pageType] = '';
            }
            pageContents[page.pageType] += `\n--- ${page.url} ---\n${textContent}\n`;
        }
        // Organize scraped content by page type
        let organizedContent = '';
        const pageOrder = ['home', 'about', 'services', 'contact'];
        for (const pageType of pageOrder) {
            if (pageContents[pageType]) {
                organizedContent += `\n=== ${pageType.toUpperCase()} PAGE CONTENT ===\n`;
                organizedContent += optimizeContent(pageContents[pageType], 100000); // 100k tokens per page type
            }
        }
        // Process uploaded documents
        let documentContent = '';
        if (documents && documents.length > 0) {
            documentContent = documents.map((doc, index) => {
                return `\n--- DOCUMENT ${index + 1}: ${doc.name} ---\n${doc.content || doc.extractedText || 'No content available'}`;
            }).join('\n');
            documentContent = optimizeContent(documentContent, 200000); // 200k tokens for documents
        }
        // Combine all content
        const finalOptimizedContent = optimizeContent(organizedContent, 400000); // 400k for scraped content
        console.log(`Organized content length: ${finalOptimizedContent.length} characters`);
        console.log(`Additional text length: ${(additionalText || '').length} characters`);
        console.log(`Document content length: ${documentContent.length} characters`);
        // Generate underwriting prompt
        const underwritingPrompt = getUnderwritingPrompt(finalOptimizedContent, additionalText || '', documentContent, url);
        // Final token count check
        const encoder = (0, tiktoken_1.get_encoding)('cl100k_base');
        const promptTokenCount = encoder.encode(underwritingPrompt).length;
        encoder.free();
        console.log(`Final prompt token count: ${promptTokenCount}`);
        if (promptTokenCount > 1048575) {
            console.error(`Prompt exceeds token limit: ${promptTokenCount}`);
            res.status(400).json({ error: 'Content too large to process. Please reduce the amount of text or documents.' });
            return;
        }
        // Generate the underwriting report
        const reportContent = await aiService_1.aiService.generateReport(underwritingPrompt);
        // Add metadata to report
        const finalReport = `# Underwriting Research Report\n\n**Company:** ${new URL(url).hostname}\n**Generated:** ${new Date().toLocaleDateString()}\n**Analysis Type:** Comprehensive Risk Assessment\n\n---\n\n${reportContent}`;
        // Return as JSON for the frontend to display
        res.json({
            success: true,
            report: finalReport,
            metadata: {
                pagesAnalyzed: targetPages.length,
                pageTypes: Object.keys(pageContents),
                documentCount: documents ? documents.length : 0,
                companyUrl: url
            }
        });
    }
    catch (error) {
        console.error('Failed to generate underwriting research report:', error);
        res.status(500).json({ error: 'Failed to generate research report' });
    }
};
exports.generateResearchReport = generateResearchReport;
//# sourceMappingURL=researchController.js.map