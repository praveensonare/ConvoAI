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
    <div className="w-full mb-6">
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2 bg-white bg-opacity-50">
          <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
            {fileName || 'PDF Document'}
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              className="p-2 rounded-md hover:bg-white hover:shadow-md transition-all disabled:opacity-40"
              title="Zoom out"
              disabled={scale <= 0.5}
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-sm font-medium text-slate-700 min-w-[50px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-2 rounded-md hover:bg-white hover:shadow-md transition-all disabled:opacity-40"
              title="Zoom in"
              disabled={scale >= 3.0}
            >
              <ZoomIn size={18} />
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            <button
              onClick={downloadFile}
              className="p-2 rounded-md hover:bg-white hover:shadow-md transition-all"
              title="Download"
            >
              <Download size={18} />
            </button>
          </div>
        </div>

        <div className="bg-white overflow-auto max-h-[700px]">
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-300 border-t-blue-600 mb-4"></div>
                <p className="text-slate-600 font-medium">Loading PDF...</p>
              </div>
            }
            error={
              <div className="p-12 text-center">
                <div className="text-red-500 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-600 font-medium">Failed to load PDF file.</p>
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
          <div className="px-4 py-3 flex items-center justify-center gap-4 bg-white bg-opacity-50 border-t border-slate-200">
            <button
              onClick={previousPage}
              disabled={pageNumber <= 1}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              <ChevronLeft size={18} />
              <span className="text-sm font-medium">Previous</span>
            </button>
            <span className="text-sm font-semibold text-slate-700 bg-white px-4 py-2 rounded-md border-2 border-slate-300 min-w-[140px] text-center">
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={nextPage}
              disabled={pageNumber >= numPages}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              <span className="text-sm font-medium">Next</span>
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
