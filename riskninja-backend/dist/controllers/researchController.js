"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResearchReport = void 0;
const axios_1 = __importDefault(require("axios"));
const aiService_1 = require("../services/aiService");
const pdfGenerator_1 = require("../services/pdfGenerator");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Crawler = require('simplecrawler');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cheerio = require('cheerio');
const html_to_text_1 = require("html-to-text");
const generateResearchReport = async (req, res) => {
    const { url } = req.body;
    if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
    }
    try {
        // Crawl pages and track URLs for later source listing
        const crawlSite = (startUrl) => new Promise((resolve, reject) => {
            const crawler = new Crawler(startUrl);
            crawler.maxDepth = 2;
            const pages = [];
            // Safety guard: stop after 20 seconds
            const crawlTimeout = setTimeout(() => {
                crawler.stop();
                resolve(pages);
            }, 20 * 1000);
            crawler.on('fetchcomplete', (queueItem, data) => {
                pages.push({ url: queueItem.url, html: data.toString() });
            });
            crawler.on('complete', () => {
                clearTimeout(crawlTimeout);
                resolve(pages);
            });
            ['fetcherror', 'fetchtimeout', 'fetchclienterror'].forEach(evt => crawler.on(evt, () => { }));
            crawler.start();
        });
        const pages = await crawlSite(url);
        const textContent = pages.map(p => (0, html_to_text_1.htmlToText)(p.html, { wordwrap: false })).join('\n');
        // 2. External Web Search Snippets
        const hostname = new URL(url).hostname.replace(/^[^\.]+\./, '');
        const searchRes = await axios_1.default.get(`https://www.google.com/search?q=${encodeURIComponent(hostname)}`);
        const $ = cheerio.load(searchRes.data);
        const snippets = [];
        $('div.BNeawe').each((_i, el) => { snippets.push($(el).text()); });
        const externalText = snippets.join('\n');
        // Combine crawled and external content
        const combinedContent = `--- Crawled Content ---\n${textContent}\n\n--- External Search Snippets for ${hostname} ---\n${externalText}`;
        // 3. AI-Powered Analysis (using the Pareto prompt)
        const paretoPrompt = `
      Pareto Knowledge Acquisition System: Insurance & Risk Management Underwriting
      This GEM is designed to transform the complex domain of insurance and risk management underwriting into an actionable framework, leveraging the Pareto principle to focus on the critical 20% of information that drives 80% of effective underwriting decisions.
      
      Analyze the combined content (crawled site data and external search snippets) and generate a detailed underwriting report:
      
      ---
      ${combinedContent}
      ---
    `;
        const reportContent = await aiService_1.aiService.generateReport(paretoPrompt);
        // Append Sources section to report markdown
        const uniqueSources = Array.from(new Set(pages.map(p => p.url)));
        const externalSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(hostname)}`;
        const allSources = [...uniqueSources, externalSearchUrl];
        const sourcesMarkdown = ['\n---', '**Sources**:']
            .concat(allSources.map(src => `- ${src}`))
            .join('\n');
        const finalMarkdown = reportContent + sourcesMarkdown;
        // 4. PDF Generation
        const pdfBuffer = await (0, pdfGenerator_1.generatePdfFromReport)(finalMarkdown);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=research-report.pdf');
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Failed to generate research report:', error);
        res.status(500).json({ error: 'Failed to generate research report' });
    }
};
exports.generateResearchReport = generateResearchReport;
//# sourceMappingURL=researchController.js.map