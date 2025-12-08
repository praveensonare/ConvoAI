import { useState } from 'react';
import { ZoomIn, ZoomOut, Download, Maximize2, X } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt?: string;
  fileName?: string;
}

export default function ImageViewer({ src, alt, fileName }: ImageViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1.0);

  function zoomIn() {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  }

  function zoomOut() {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  }

  function downloadImage() {
    const link = document.createElement('a');
    link.href = src;
    link.download = fileName || 'image.png';
    link.click();
  }

  function toggleFullscreen() {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setScale(1.0); // Reset scale when entering fullscreen
    }
  }

  return (
    <>
      <div className="w-full mb-6">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg shadow-lg border border-slate-200">
          <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {fileName || alt || 'Image'}
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
                onClick={toggleFullscreen}
                className="p-2 rounded-md hover:bg-white hover:shadow-md transition-all"
                title="Fullscreen"
              >
                <Maximize2 size={18} />
              </button>
              <button
                onClick={downloadImage}
                className="p-2 rounded-md hover:bg-white hover:shadow-md transition-all"
                title="Download"
              >
                <Download size={18} />
              </button>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-300 rounded-md overflow-auto max-h-[700px] flex items-center justify-center">
            <img
              src={src}
              alt={alt || 'Image'}
              style={{ transform: `scale(${scale})`, transition: 'transform 0.2s' }}
              className="max-w-full h-auto"
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

          <div className="max-w-[90vw] max-h-[90vh] overflow-auto">
            <img
              src={src}
              alt={alt || 'Image'}
              style={{ transform: `scale(${scale})`, transition: 'transform 0.2s' }}
              className="max-w-full h-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                zoomOut();
              }}
              className="p-2 rounded hover:bg-white/20 text-white transition-colors"
              title="Zoom out"
              disabled={scale <= 0.5}
            >
              <ZoomOut size={20} />
            </button>
            <span className="text-sm text-white font-medium">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                zoomIn();
              }}
              className="p-2 rounded hover:bg-white/20 text-white transition-colors"
              title="Zoom in"
              disabled={scale >= 3.0}
            >
              <ZoomIn size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
