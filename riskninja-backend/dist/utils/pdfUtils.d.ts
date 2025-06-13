export interface WordSpan {
    page: number;
    text: string;
    bbox: [number, number, number, number];
    startOffset: number;
    endOffset: number;
}
export declare function extractWordSpans(buffer: Buffer): Promise<WordSpan[]>;
//# sourceMappingURL=pdfUtils.d.ts.map