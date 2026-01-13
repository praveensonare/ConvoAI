import { useEffect, useRef, useState } from 'react';
import { Printer, Download, Maximize2, X, FileDown } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface IframeRendererProps {
  htmlCode: string;
  height?: string;
  onButtonClick?: (buttonText: string) => void;
  topic?: string;
}

export default function IframeRenderer({ htmlCode, height = '600px', onButtonClick, topic }: IframeRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  useEffect(() => {
    // Force iframe refresh when htmlCode changes
    setIframeKey(prev => prev + 1);
    // Reset processing state when new content arrives
    setIsProcessing(false);
    processingRef.current = false;
  }, [htmlCode]);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BUTTON_CLICK' && event.data?.buttonText) {
        // Prevent multiple calls
        if (processingRef.current) {
          console.log('Already processing a request, ignoring duplicate click');
          return;
        }

        processingRef.current = true;
        setIsProcessing(true);
        onButtonClick?.(event.data.buttonText);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onButtonClick]);

  // Send loading state to iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'SET_LOADING',
        isLoading: isProcessing
      }, '*');
    }
  }, [isProcessing]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const writeContent = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

        if (iframeDoc) {
          iframeDoc.open();

          // Inject script to handle button clicks
          const scriptToInject = `
            <script>
              let isButtonProcessing = false;

              // Listen for loading state from parent
              window.addEventListener('message', function(event) {
                if (event.data?.type === 'SET_LOADING') {
                  isButtonProcessing = event.data.isLoading;
                  updateButtonStates();
                }
              });

              // Function to handle stage transition buttons
              function handleStageButton(buttonText) {
                if (isButtonProcessing) {
                  console.log('Request already in progress');
                  return;
                }

                isButtonProcessing = true;
                updateButtonStates();
                window.parent.postMessage({ type: 'BUTTON_CLICK', buttonText: buttonText }, '*');
              }

              // Update button states based on processing status
              function updateButtonStates() {
                const stageButtons = document.querySelectorAll('[data-stage-action]');
                stageButtons.forEach(button => {
                  if (isButtonProcessing) {
                    button.disabled = true;
                    button.style.opacity = '0.5';
                    button.style.cursor = 'not-allowed';
                    button.style.pointerEvents = 'none';
                  } else {
                    button.disabled = false;
                    button.style.opacity = '1';
                    button.style.cursor = 'pointer';
                    button.style.pointerEvents = 'auto';
                  }
                });
              }

              // Auto-attach to buttons with data-stage-action attribute
              document.addEventListener('DOMContentLoaded', function() {
                const stageButtons = document.querySelectorAll('[data-stage-action]');
                stageButtons.forEach(button => {
                  button.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const buttonText = this.getAttribute('data-stage-action') || this.textContent.trim();
                    handleStageButton(buttonText);
                  });
                });
              });
            </script>
          `;

          // Insert the script before closing </body> tag or at the end
          let modifiedHtml = htmlCode;
          if (htmlCode.includes('</body>')) {
            modifiedHtml = htmlCode.replace('</body>', scriptToInject + '</body>');
          } else if (htmlCode.includes('</html>')) {
            modifiedHtml = htmlCode.replace('</html>', scriptToInject + '</html>');
          } else {
            modifiedHtml = htmlCode + scriptToInject;
          }

          iframeDoc.write(modifiedHtml);
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
      <div className="w-full mb-4">
        <div className="rounded-lg shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 flex items-center justify-between flex-wrap gap-2 bg-white bg-opacity-50">
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {topic || 'Interactive Visualization'}
            </h4>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={handlePrint}
                className="p-1.5 sm:p-2 rounded-md hover:bg-white hover:shadow-md transition-all"
                title="Print"
              >
                <Printer size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
              <button
                onClick={handleDownloadPDF}
                className="p-1.5 sm:p-2 rounded-md hover:bg-white hover:shadow-md transition-all"
                title="Download as PDF"
              >
                <FileDown size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
              <button
                onClick={handleDownloadHTML}
                className="p-1.5 sm:p-2 rounded-md hover:bg-white hover:shadow-md transition-all hidden sm:block"
                title="Download HTML"
              >
                <Download size={18} />
              </button>
              <div className="w-px h-4 sm:h-6 bg-slate-300 mx-0.5 sm:mx-1"></div>
              <button
                onClick={toggleFullscreen}
                className="p-1.5 sm:p-2 rounded-md hover:bg-white hover:shadow-md transition-all"
                title="Fullscreen"
              >
                <Maximize2 size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            </div>
          </div>

          <div>
            <iframe
              key={iframeKey}
              ref={iframeRef}
              sandbox="allow-scripts allow-same-origin"
              className="w-full"
              style={{
                height: '80vh',
                minHeight: '500px',
                maxHeight: '90vh',
                border: 'none',
                background: '#fafafa'
              }}
              title="Rendered HTML Output"
            />
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-2 sm:p-4"
          onClick={toggleFullscreen}
        >
          <button
            onClick={toggleFullscreen}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            title="Close"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>

          <div className="w-full h-full max-w-[98vw] sm:max-w-[95vw] max-h-[95vh] rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="h-full w-full">
              <iframe
                key={`fullscreen-${iframeKey}`}
                srcDoc={htmlCode}
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-full"
                style={{ border: 'none', background: '#fafafa' }}
                title="Fullscreen HTML Output"
              />
            </div>
          </div>

          <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-4 bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-4 py-1.5 sm:py-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrint();
              }}
              className="p-1.5 sm:p-2 rounded hover:bg-white/20 text-white transition-colors flex items-center gap-1 sm:gap-2"
              title="Print"
            >
              <Printer size={18} className="sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm font-medium hidden sm:inline">Print</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadPDF();
              }}
              className="p-1.5 sm:p-2 rounded hover:bg-white/20 text-white transition-colors flex items-center gap-1 sm:gap-2"
              title="Download PDF"
            >
              <FileDown size={18} className="sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm font-medium hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadHTML();
              }}
              className="p-1.5 sm:p-2 rounded hover:bg-white/20 text-white transition-colors flex items-center gap-1 sm:gap-2"
              title="Download HTML"
            >
              <Download size={18} className="sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm font-medium hidden sm:inline">HTML</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
