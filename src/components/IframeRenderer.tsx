import { useEffect, useRef, useState } from 'react';
import { Printer, Download, Maximize2, X, FileDown } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface IframeRendererProps {
  htmlCode: string;
  height?: string;
}

export default function IframeRenderer({ htmlCode, height = '600px' }: IframeRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Force iframe refresh when htmlCode changes
    setIframeKey(prev => prev + 1);
  }, [htmlCode]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const writeContent = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(htmlCode);
          iframeDoc.close();
        }
      } catch (error) {
        console.error('Error writing to iframe:', error);
      }
    };

    // Wait for iframe to be ready
    if (iframe.contentDocument?.readyState === 'complete') {
      writeContent();
    } else {
      iframe.onload = writeContent;
    }

    return () => {
      iframe.onload = null;
    };
  }, [htmlCode, iframeKey]);

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  const handleDownloadHTML = () => {
    const blob = new Blob([htmlCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chart-${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.body) return;

    try {
      // Get the iframe content
      const element = iframe.contentDocument.body;

      // Configure PDF options
      const options = {
        margin: 10,
        filename: `chart-${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Generate and download PDF
      await html2pdf().from(element).set(options).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <>
      <div className="w-full mb-6">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 flex items-center justify-between flex-wrap gap-2 bg-white bg-opacity-50">
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Interactive Chart
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="p-2 rounded-md hover:bg-white hover:shadow-md transition-all"
                title="Print"
              >
                <Printer size={18} />
              </button>
              <button
                onClick={handleDownloadPDF}
                className="p-2 rounded-md hover:bg-white hover:shadow-md transition-all"
                title="Download as PDF"
              >
                <FileDown size={18} />
              </button>
              <button
                onClick={handleDownloadHTML}
                className="p-2 rounded-md hover:bg-white hover:shadow-md transition-all"
                title="Download HTML"
              >
                <Download size={18} />
              </button>
              <div className="w-px h-6 bg-slate-300 mx-1"></div>
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-md hover:bg-white hover:shadow-md transition-all"
                title="Fullscreen"
              >
                <Maximize2 size={18} />
              </button>
            </div>
          </div>

          <div className="bg-white">
            <iframe
              key={iframeKey}
              ref={iframeRef}
              sandbox="allow-scripts allow-same-origin"
              className="w-full bg-white"
              style={{
                height,
                minHeight: '400px',
                maxHeight: '800px',
                border: 'none'
              }}
              title="Rendered HTML Output"
            />
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={toggleFullscreen}
        >
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close"
          >
            <X size={24} />
          </button>

          <div className="w-full h-full max-w-[95vw] max-h-[95vh] bg-white rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="h-full w-full">
              <iframe
                key={`fullscreen-${iframeKey}`}
                srcDoc={htmlCode}
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-full"
                style={{ border: 'none' }}
                title="Fullscreen HTML Output"
              />
            </div>
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrint();
              }}
              className="p-2 rounded hover:bg-white/20 text-white transition-colors flex items-center gap-2"
              title="Print"
            >
              <Printer size={20} />
              <span className="text-sm font-medium">Print</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadPDF();
              }}
              className="p-2 rounded hover:bg-white/20 text-white transition-colors flex items-center gap-2"
              title="Download PDF"
            >
              <FileDown size={20} />
              <span className="text-sm font-medium">PDF</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadHTML();
              }}
              className="p-2 rounded hover:bg-white/20 text-white transition-colors flex items-center gap-2"
              title="Download HTML"
            >
              <Download size={20} />
              <span className="text-sm font-medium">HTML</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
