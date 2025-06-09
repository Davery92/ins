import puppeteer from 'puppeteer';
import { marked } from 'marked';

/**
 * Generates a PDF buffer from a markdown string of report content.
 *
 * @param reportContent The markdown content of the report to be converted.
 * @returns A Promise that resolves with the PDF buffer.
 */
export const generatePdfFromReport = async (reportContent: string): Promise<Buffer> => {
  // Convert Markdown to HTML
  const htmlBody = marked(reportContent);
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 2cm; }
    h1, h2, h3, h4, h5, h6 { font-weight: bold; }
    pre { background: #f4f4f4; padding: 10px; }
    code { background: #f4f4f4; padding: 2px 4px; }
  </style>
</head>
<body>${htmlBody}</body>
</html>`;

  // Launch headless browser
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  // Generate PDF as Uint8Array and convert to Buffer
  const pdfBufferRaw = await page.pdf({ format: 'A4', margin: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' } });
  await browser.close();
  const pdfBuffer = Buffer.from(pdfBufferRaw);
  return pdfBuffer;
}; 