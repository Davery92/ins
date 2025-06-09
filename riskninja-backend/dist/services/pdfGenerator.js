"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePdfFromReport = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const marked_1 = require("marked");
/**
 * Generates a PDF buffer from a markdown string of report content.
 *
 * @param reportContent The markdown content of the report to be converted.
 * @returns A Promise that resolves with the PDF buffer.
 */
const generatePdfFromReport = async (reportContent) => {
    // Convert Markdown to HTML
    const htmlBody = (0, marked_1.marked)(reportContent);
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
    const browser = await puppeteer_1.default.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    // Generate PDF as Uint8Array and convert to Buffer
    const pdfBufferRaw = await page.pdf({ format: 'A4', margin: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' } });
    await browser.close();
    const pdfBuffer = Buffer.from(pdfBufferRaw);
    return pdfBuffer;
};
exports.generatePdfFromReport = generatePdfFromReport;
//# sourceMappingURL=pdfGenerator.js.map