// Use dynamic import to load PDFJS as ESM

export interface WordSpan {
  page: number;
  text: string;
  bbox: [number, number, number, number];
  startOffset: number;
  endOffset: number;
}

export async function extractWordSpans(buffer: Buffer): Promise<WordSpan[]> {
  // Dynamically import PDFJS (resolves to build/pdf.mjs)
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
  // Load the PDF document
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  const spans: WordSpan[] = [];

  // Iterate through each page
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent({ normalizeWhitespace: true });
    let pageText = '';

    // Each item in textContent.items represents a chunk of text with position data
    for (const item of textContent.items as any[]) {
      const text = item.str as string;
      const x = item.transform[4] as number;
      const y = item.transform[5] as number;
      const width = item.width as number;
      const height = item.height as number;

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