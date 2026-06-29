import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ImageViewer from './ImageViewer';
import DocumentViewer from './DocumentViewer';
import CodeRenderer from './CodeRenderer';

interface MessageContentProps {
  content: string;
  attachments?: Array<{
    type: 'image' | 'document' | 'spreadsheet' | 'text' | 'csv';
    url: string;
    fileName?: string;
    extractedContent?: string;
  }>;
  role: 'user' | 'assistant';
}

interface ParsedContent {
  type: 'text' | 'code' | 'html';
  content: string;
  language?: string;
}

function parseMessageContent(content: string): ParsedContent[] {
  const parts: ParsedContent[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textContent = content.substring(lastIndex, match.index).trim();
      if (textContent) {
        parts.push({ type: 'text', content: textContent });
      }
    }

    const language = match[1] || '';
    const codeContent = match[2].trim();

    if (language === 'html' || language === 'javascript' || language === 'js') {
      parts.push({
        type: 'html',
        content: codeContent,
        language: language,
      });
    } else {
      parts.push({
        type: 'code',
        content: codeContent,
        language: language || 'text',
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const textContent = content.substring(lastIndex).trim();
    if (textContent) {
      parts.push({ type: 'text', content: textContent });
    }
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', content });
  }

  return parts;
}

export default function MessageContent({ content, attachments, role }: MessageContentProps) {
  const parsedContent = useMemo(() => {
    if (!content || content.trim() === '') {
      return [];
    }
    return parseMessageContent(content);
  }, [content]);

  return (
    <div className="message-content">
      {attachments && attachments.length > 0 && role === 'user' && (
        <div className="attachments mb-3">
          {attachments.map((attachment, idx) => {
            if (attachment.type === 'image') {
              return (
                <ImageViewer
                  key={idx}
                  src={attachment.url}
                  fileName={attachment.fileName}
                  alt={attachment.fileName}
                />
              );
            } else if (attachment.type === 'document') {
              return (
                <DocumentViewer
                  key={idx}
                  file={attachment.url}
                  fileName={attachment.fileName}
                />
              );
            }
            return null;
          })}
        </div>
      )}

      {parsedContent.map((part, index) => {
        if (part.type === 'html') {
          return null;
        }

        if (part.type === 'code') {
          return (
            <CodeRenderer
              key={index}
              code={part.content}
              language={part.language || 'text'}
            />
          );
        }

        return (
          <div key={index} className="prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {part.content}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}

export function isRawHtml(content: string): boolean {
  const trimmed = content.trim().toLowerCase();
  return (
    trimmed.startsWith('<!doctype html') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<!DOCTYPE html') ||
    trimmed.startsWith('<HTML')
  );
}

export function isJavaScriptCode(content: string): boolean {
  const trimmed = content.trim();
  // If it's not HTML but contains JS patterns, wrap it
  if (isRawHtml(trimmed)) return false;
  // Check for standalone JS that isn't markdown
  const hasJsPatterns =
    /^(const|let|var|function|class|import|export|document\.|window\.|console\.)/m.test(trimmed);
  const hasNoMarkdown = !trimmed.startsWith('#') && !trimmed.startsWith('-') && !trimmed.startsWith('*');
  return hasJsPatterns && hasNoMarkdown;
}

export function extractHtmlContent(content: string): string[] {
  const htmlBlocks: string[] = [];

  // 1. Raw HTML document (not in code blocks)
  if (isRawHtml(content)) {
    htmlBlocks.push(content.trim());
    return htmlBlocks;
  }

  // 2. HTML code blocks
  const htmlRegex = /```html\n([\s\S]*?)```/g;
  let match;
  while ((match = htmlRegex.exec(content)) !== null) {
    htmlBlocks.push(match[1].trim());
  }

  // 3. JavaScript code blocks -> wrap in HTML
  const jsRegex = /```(?:javascript|js)\n([\s\S]*?)```/g;
  while ((match = jsRegex.exec(content)) !== null) {
    const jsCode = match[1].trim();
    const wrappedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
    #app { width: 100%; max-width: 100%; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>${jsCode}</script>
</body>
</html>`;
    htmlBlocks.push(wrappedHtml);
  }

  // 4. Standalone JavaScript (not in code blocks)
  if (isJavaScriptCode(content)) {
    const wrappedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
    #app { width: 100%; max-width: 100%; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>${content.trim()}</script>
</body>
</html>`;
    htmlBlocks.push(wrappedHtml);
  }

  return htmlBlocks;
}
