import { Response } from 'express';
import axios from 'axios';
import { AuthRequest } from '../types';
import { aiService } from '../services/aiService';
import { generatePdfFromReport } from '../services/pdfGenerator';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Crawler: any = require('simplecrawler');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cheerio: any = require('cheerio');
import { htmlToText } from 'html-to-text';
import { getParetoPrompt } from './paretoprompt';

export const generateResearchReport = async (req: AuthRequest, res: Response): Promise<void> => {
  const { url } = req.body;

  if (!url) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  try {
    // Crawl pages and track URLs for later source listing
    const crawlSite = (startUrl: string): Promise<{ url: string; html: string }[]> => new Promise((resolve, reject) => {
      const crawler = new Crawler(startUrl) as any;
      crawler.maxDepth = 2;
      const pages: { url: string; html: string }[] = [];
      // Safety guard: stop after 20 seconds
      const crawlTimeout = setTimeout(() => {
        crawler.stop();
        resolve(pages);
      }, 20 * 1000);
      crawler.on('fetchcomplete', (queueItem: any, data: any) => {
        pages.push({ url: queueItem.url, html: data.toString() });
      });
      crawler.on('complete', () => {
        clearTimeout(crawlTimeout);
        resolve(pages);
      });
      ['fetcherror', 'fetchtimeout', 'fetchclienterror'].forEach(evt => crawler.on(evt, () => {}));
      crawler.start();
    });
    const pages = await crawlSite(url);
    const textContent = pages.map(p => htmlToText(p.html, { wordwrap: false })).join('\n');

    // 2. External Web Search Snippets
    const hostname = new URL(url).hostname.replace(/^[^\.]+\./, '');
    const searchRes = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(hostname)}`);
    const $ = cheerio.load(searchRes.data);
    const snippets: string[] = [];
    $('div.BNeawe').each((_i: number, el: any) => { snippets.push($(el).text()); });
    const externalText = snippets.join('\n');

    // Combine crawled and external content
    const combinedContent = `--- Crawled Content ---\n${textContent}\n\n--- External Search Snippets for ${hostname} ---\n${externalText}`;

    // 3. AI-Powered Analysis (using the Pareto prompt)
    const paretoPrompt = getParetoPrompt(combinedContent);

    const reportContent = await aiService.generateReport(paretoPrompt);

    // Append Sources section to report markdown
    const crawledDomains = Array.from(new Set(pages.map(p => new URL(p.url).hostname)));
    const externalSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(hostname)}`;
    const externalDomain = new URL(externalSearchUrl).hostname;
    const allSources = Array.from(new Set([...crawledDomains, externalDomain]));
    const sourcesMarkdown = ['\n---', '**Sources**:']
      .concat(allSources.map(src => `- ${src}`))
      .join('\n');

    const finalMarkdown = reportContent + sourcesMarkdown;

    // If preview mode, return markdown instead of PDF
    const preview = req.query.preview === 'true';
    if (preview) {
      res.setHeader('Content-Type', 'application/json');
      res.json({ markdown: finalMarkdown });
      return;
    }

    // 4. PDF Generation
    const pdfBuffer = await generatePdfFromReport(finalMarkdown);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=research-report.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Failed to generate research report:', error);
    res.status(500).json({ error: 'Failed to generate research report' });
  }
};
