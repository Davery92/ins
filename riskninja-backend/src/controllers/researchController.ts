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
import { get_encoding } from '@dqbd/tiktoken';

// Function to optimize and truncate content to fit token limits
const optimizeContent = (content: string, maxTokens: number = 800000): string => {
  const encoder = get_encoding('cl100k_base');
  
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
  } finally {
    encoder.free();
  }
};

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
      crawler.maxDepth = 1; // Reduced from 2 to 1 to get less content
      crawler.maxConcurrency = 3; // Limit concurrent requests
      const pages: { url: string; html: string }[] = [];
      let pageCount = 0;
      const maxPages = 10; // Limit total pages crawled
      
      // Safety guard: stop after 15 seconds (reduced from 20)
      const crawlTimeout = setTimeout(() => {
        crawler.stop();
        resolve(pages);
      }, 15 * 1000);
      crawler.on('fetchcomplete', (queueItem: any, data: any) => {
        pageCount++;
        pages.push({ url: queueItem.url, html: data.toString() });
        
        // Stop crawling if we've reached the page limit
        if (pageCount >= maxPages) {
          crawler.stop();
          resolve(pages);
        }
      });
      crawler.on('complete', () => {
        clearTimeout(crawlTimeout);
        resolve(pages);
      });
      ['fetcherror', 'fetchtimeout', 'fetchclienterror'].forEach(evt => crawler.on(evt, () => {}));
      crawler.start();
    });
    const pages = await crawlSite(url);
    let textContent = pages.map(p => htmlToText(p.html, { 
      wordwrap: false,
      selectors: [
        // Remove navigation, header, footer elements that don't add content value
        { selector: 'nav', format: 'skip' },
        { selector: 'header', format: 'skip' },
        { selector: 'footer', format: 'skip' },
        { selector: '.navigation', format: 'skip' },
        { selector: '.menu', format: 'skip' },
        { selector: '.sidebar', format: 'skip' },
        { selector: 'script', format: 'skip' },
        { selector: 'style', format: 'skip' }
      ]
    })).join('\n');

    // 2. External Web Search Snippets
    const hostname = new URL(url).hostname.replace(/^[^\.]+\./, '');
    const searchRes = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(hostname)}`);
    const $ = cheerio.load(searchRes.data);
    const snippets: string[] = [];
    $('div.BNeawe').each((_i: number, el: any) => { 
      const text = $(el).text().trim();
      if (text.length > 10) { // Only include meaningful snippets
        snippets.push(text); 
      }
    });
    const externalText = snippets.slice(0, 20).join('\n'); // Limit to 20 snippets

    console.log(`Raw content lengths - Crawled: ${textContent.length}, External: ${externalText.length}`);

    // Optimize individual sections first
    textContent = optimizeContent(textContent, 400000); // Reserve 400k tokens for crawled content
    const optimizedExternalText = optimizeContent(externalText, 50000); // Reserve 50k tokens for external content

    // Combine crawled and external content
    const combinedContent = `--- Crawled Content ---\n${textContent}\n\n--- External Search Snippets for ${hostname} ---\n${optimizedExternalText}`;

    // Final optimization pass
    const finalOptimizedContent = optimizeContent(combinedContent, 600000); // Reserve 600k for combined content, leaving room for prompt

    console.log(`Final optimized content length: ${finalOptimizedContent.length} characters`);

    // 3. AI-Powered Analysis (using the Pareto prompt)
    const paretoPrompt = getParetoPrompt(finalOptimizedContent);

    // Final token count check
    const encoder = get_encoding('cl100k_base');
    const promptTokenCount = encoder.encode(paretoPrompt).length;
    encoder.free();
    
    console.log(`Final prompt token count: ${promptTokenCount}`);
    
    if (promptTokenCount > 1048575) {
      console.error(`Prompt still exceeds token limit: ${promptTokenCount}`);
      res.status(400).json({ error: 'Content too large to process. Please try a smaller website.' });
      return;
    }

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
