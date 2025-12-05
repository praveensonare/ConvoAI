import { useState, useEffect, useRef } from 'react';
import { Code, Eye, RefreshCw } from 'lucide-react';

interface CodeRendererProps {
  code: string;
  language: string;
}

// Detect if code contains renderable HTML/CSS/JS
function isRenderableCode(code: string, language: string): boolean {
  const lowerCode = code.toLowerCase();
  const lowerLang = language.toLowerCase();

  // Only render if explicitly marked as html, svg, or css
  if (['html', 'svg', 'css'].includes(lowerLang)) {
    return true;
  }

  // For unmarked code blocks, only render if they contain complete HTML structure
  if (lowerCode.includes('<!doctype html') ||
      (lowerCode.includes('<html') && lowerCode.includes('</html'))) {
    return true;
  }

  // Render standalone SVG
  if (lowerCode.trim().startsWith('<svg') && lowerCode.includes('</svg>')) {
    return true;
  }

  return false;
}

// Prepare code for rendering in iframe
function prepareCodeForRendering(code: string, language: string): string {
  const lowerLang = language.toLowerCase();

  // If it's SVG, wrap it properly
  if (lowerLang === 'svg' || code.trim().startsWith('<svg')) {
    if (!code.includes('xmlns')) {
      return code.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    return code;
  }

  // If it's CSS, create an HTML document with styles
  if (lowerLang === 'css') {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
    ${code}
  </style>
</head>
<body>
  <div class="demo-container">
    <h1>Styled Heading</h1>
    <p>This is a paragraph with the applied styles.</p>
    <button>Sample Button</button>
    <div class="box">Sample Box</div>
  </div>
</body>
</html>
    `;
  }

  // If it's JavaScript, wrap in HTML
  if ((lowerLang === 'javascript' || lowerLang === 'js') && !code.includes('<html')) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
    canvas { border: 1px solid #ddd; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    ${code}
  </script>
</body>
</html>
    `;
  }

  // If it's already complete HTML, return as-is
  if (code.includes('<!DOCTYPE') || code.includes('<html')) {
    return code;
  }

  // Otherwise, wrap in basic HTML structure
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  ${code}
</body>
</html>
  `;
}

export default function CodeRenderer({ code, language }: CodeRendererProps) {
  const [showRendered, setShowRendered] = useState(true);
  const [renderKey, setRenderKey] = useState(0);
  const [iframeHeight, setIframeHeight] = useState(400);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isRenderable = isRenderableCode(code, language);

  useEffect(() => {
    if (showRendered && isRenderable && iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;

      if (doc) {
        const renderedCode = prepareCodeForRendering(code, language);
        doc.open();
        doc.write(renderedCode);
        doc.close();

        // Adjust iframe height based on content
        const adjustHeight = () => {
          try {
            const contentHeight = doc.body?.scrollHeight || 400;
            setIframeHeight(Math.max(contentHeight + 20, 300)); // Min 300px
          } catch (e) {
            // Cross-origin or other errors - use default height
            setIframeHeight(400);
          }
        };

        // Adjust height after a short delay to allow content to render
        setTimeout(adjustHeight, 100);
      }
    }
  }, [code, language, showRendered, isRenderable, renderKey]);

  const handleRefresh = () => {
    setRenderKey(prev => prev + 1);
  };

  // If not renderable, show regular code block
  if (!isRenderable) {
    return (
      <div className="my-3">
        <div className="bg-slate-900 rounded-lg overflow-hidden">
          {language && (
            <div className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-mono">
              {language}
            </div>
          )}
          <pre className="p-4 overflow-x-auto">
            <code className="text-sm text-slate-100 font-mono">
              {code}
            </code>
          </pre>
        </div>
      </div>
    );
  }

  // Renderable code with toggle
  return (
    <div className="my-3">
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {/* Header with controls */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-600">{language}</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">Renderable Output</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-1 rounded hover:bg-slate-200 transition-colors"
              title="Refresh render"
            >
              <RefreshCw size={14} className="text-slate-600" />
            </button>
            <button
              onClick={() => setShowRendered(!showRendered)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                showRendered
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {showRendered ? (
                <>
                  <Eye size={14} />
                  <span>Rendered</span>
                </>
              ) : (
                <>
                  <Code size={14} />
                  <span>Source</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content area */}
        {showRendered ? (
          <div className="bg-white overflow-auto" style={{ maxHeight: '500px' }}>
            <iframe
              ref={iframeRef}
              key={renderKey}
              sandbox="allow-scripts"
              className="w-full border-0"
              style={{
                height: `${Math.min(iframeHeight, 500)}px`,
                display: 'block',
                maxHeight: '500px',
                minHeight: '200px'
              }}
              title="Rendered output"
            />
          </div>
        ) : (
          <div className="bg-slate-900">
            <pre className="p-4 overflow-x-auto">
              <code className="text-sm text-slate-100 font-mono">
                {code}
              </code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
