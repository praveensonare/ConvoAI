import { useEffect, useRef, useState } from 'react';

interface IframeRendererProps {
  htmlCode: string;
  height?: string;
}

export default function IframeRenderer({ htmlCode, height = '600px' }: IframeRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);

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

  return (
    <div className="w-full mb-6">
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg shadow-lg border border-slate-200">
        <iframe
          key={iframeKey}
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin"
          className="w-full border-2 border-slate-300 rounded-md bg-white"
          style={{
            height,
            minHeight: '400px',
            maxHeight: '800px'
          }}
          title="Rendered HTML Output"
        />
      </div>
    </div>
  );
}
