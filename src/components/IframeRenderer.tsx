import { useEffect, useRef } from 'react';

interface IframeRendererProps {
  htmlCode: string;
  height?: string;
}

export default function IframeRenderer({ htmlCode, height = '600px' }: IframeRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(htmlCode);
        iframeDoc.close();
      }
    }
  }, [htmlCode]);

  return (
    <div className="w-full mb-6 flex justify-center">
      <div className="w-full max-w-full">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg shadow-lg border border-slate-200">
          <iframe
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
    </div>
  );
}
