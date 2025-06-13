"use strict";
// Use dynamic import to load PDFJS as ESM
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractWordSpans = extractWordSpans;
async function extractWordSpans(buffer) {
    // Dynamically import PDFJS (resolves to build/pdf.mjs)
    const pdfjsLib = await Promise.resolve().then(() => __importStar(require('pdfjs-dist/legacy/build/pdf')));
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    const spans = [];
    // Iterate through each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent({ normalizeWhitespace: true });
        let pageText = '';
        // Each item in textContent.items represents a chunk of text with position data
        for (const item of textContent.items) {
            const text = item.str;
            const x = item.transform[4];
            const y = item.transform[5];
            const width = item.width;
            const height = item.height;
            const startOffset = pageText.length;
            pageText += text;
            const endOffset = pageText.length;
            spans.push({
                page: pageNum,
                text,
                bbox: [x, y, width, height],
                startOffset,
                endOffset,
            });
        }
    }
    return spans;
}
//# sourceMappingURL=pdfUtils.js.map