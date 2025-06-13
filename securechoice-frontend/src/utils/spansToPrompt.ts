export interface WordSpan {
  pageNumber: number;
  text: string;
  startOffset: number;
  endOffset: number;
}

/**
 * Convert word spans into prompt blocks with offset metadata
 */
export function spansToPrompt(docId: string, spans: WordSpan[]): string {
  return spans
    .map(span =>
      `[CITATION:${docId},${span.pageNumber},${span.startOffset},${span.endOffset}]\n${span.text}`
    )
    .join('\n');
} 