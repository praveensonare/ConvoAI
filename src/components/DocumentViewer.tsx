import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  file: string | File;
  fileName?: string;
}

export default function DocumentViewer({ file, fileName }: DocumentViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => Math.min(Math.max(1, prevPageNumber + offset), numPages));
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  function zoomIn() {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  }

  function zoomOut() {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  }

  function downloadFile() {
    if (typeof file === 'string') {
      const link = document.createElement('a');
      link.href = file;
      link.download = fileName || 'document.pdf';
      link.click();
    }
  }

  return (
    <div className="my-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-700">
          {fileName || 'PDF Document'}
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            className="p-1 rounded hover:bg-slate-200 transition-colors"
            title="Zoom out"
            disabled={scale <= 0.5}
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs text-slate-600">{Math.round(scale * 100)}%</span>
          <button
            onClick={zoomIn}
            className="p-1 rounded hover:bg-slate-200 transition-colors"
            title="Zoom in"
            disabled={scale >= 3.0}
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={downloadFile}
            className="p-1 rounded hover:bg-slate-200 transition-colors ml-2"
            title="Download"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded overflow-auto max-h-[600px]">
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="p-8 text-center text-slate-600">
              Loading PDF...
            </div>
          }
          error={
            <div className="p-8 text-center text-red-600">
              Failed to load PDF file.
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      {numPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-4">
          <button
            onClick={previousPage}
            disabled={pageNumber <= 1}
            className="p-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-slate-600">
            Page {pageNumber} of {numPages}
          </span>
          <button
            onClick={nextPage}
            disabled={pageNumber >= numPages}
            className="p-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
