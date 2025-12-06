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
    <div className="my-4 w-full flex justify-center">
      <div className="w-[90%]">
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin"
          className="w-full border border-slate-300 rounded-lg"
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
