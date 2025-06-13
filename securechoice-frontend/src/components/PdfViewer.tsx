import React, { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export interface CitationHighlight {
  page: number;
  bbox: [number, number, number, number];
}

interface PdfViewerProps {
  fileUrl: string;
  highlight?: CitationHighlight;
  onClose: () => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ fileUrl, highlight, onClose }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  useEffect(() => {
    if (highlight && containerRef.current) {
      const pageWrapper = containerRef.current.querySelector(
        `[data-page-number="${highlight.page}"]`
      ) as HTMLElement | null;
      if (pageWrapper) {
        pageWrapper.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [highlight]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="relative bg-white dark:bg-dark-surface p-4 rounded-lg max-w-screen-lg max-h-screen overflow-auto">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-2xl"
        >
          &times;
        </button>
        <div ref={containerRef}>
          <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
            {Array.from(new Array(numPages), (_, i) => i + 1).map(pageNum => (
              <div
                key={`page_${pageNum}`}
                data-page-number={pageNum}
                style={{ position: 'relative', marginBottom: '1rem' }}
              >
                <Page pageNumber={pageNum} width={800} />
                {highlight && highlight.page === pageNum && (
                  <div
                    className="absolute bg-yellow-300 bg-opacity-40 pointer-events-none"
                    style={{
                      left: highlight.bbox[0],
                      top: highlight.bbox[1],
                      width: highlight.bbox[2],
                      height: highlight.bbox[3],
                      transform: 'scale(1)'
                    }}
                  />
                )}
              </div>
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
};

export default PdfViewer; 