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
      <div className="my-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-medium text-slate-700">
            {fileName || alt || 'Image'}
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
              onClick={toggleFullscreen}
              className="p-1 rounded hover:bg-slate-200 transition-colors ml-2"
              title="Fullscreen"
            >
              <Maximize2 size={16} />
            </button>
            <button
              onClick={downloadImage}
              className="p-1 rounded hover:bg-slate-200 transition-colors"
              title="Download"
            >
              <Download size={16} />
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded overflow-auto max-h-[600px] flex items-center justify-center">
          <img
            src={src}
            alt={alt || 'Image'}
            style={{ transform: `scale(${scale})`, transition: 'transform 0.2s' }}
            className="max-w-full h-auto"
          />
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
