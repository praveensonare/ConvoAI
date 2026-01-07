import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ImageViewer from './ImageViewer';
import DocumentViewer from './DocumentViewer';
import CodeRenderer from './CodeRenderer';
import IframeRenderer from './IframeRenderer';

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
    // Add text before code block
    if (match.index > lastIndex) {
      const textContent = content.substring(lastIndex, match.index).trim();
      if (textContent) {
        parts.push({ type: 'text', content: textContent });
      }
    }

    const language = match[1] || '';
    const codeContent = match[2].trim();

    // Check if HTML or JavaScript - mark as special type for full-width rendering
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

  // Add remaining text after last code block
  if (lastIndex < content.length) {
    const textContent = content.substring(lastIndex).trim();
    if (textContent) {
      parts.push({ type: 'text', content: textContent });
    }
  }

  // If no code blocks found, return entire content as text
  if (parts.length === 0) {
    parts.push({ type: 'text', content });
  }

  return parts;
}

export default function MessageContent({ content, attachments, role }: MessageContentProps) {
  const parsedContent = useMemo(() => {
    // Handle empty content
    if (!content || content.trim() === '') {
      return [];
    }
    return parseMessageContent(content);
  }, [content]);

  return (
    <div className="message-content">
      {/* Only render user attachments in bubble - assistant attachments are rendered at full width in Home.tsx */}
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

      {/* Render parsed content */}
      {parsedContent.map((part, index) => {
        if (part.type === 'html') {
          // HTML will be rendered at full width by parent
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

// Export helper to get HTML content for full-width rendering
export function extractHtmlContent(content: string): string[] {
  const htmlBlocks: string[] = [];

  // Extract HTML code blocks
  const htmlRegex = /```html\n([\s\S]*?)```/g;
  let match;

  while ((match = htmlRegex.exec(content)) !== null) {
    htmlBlocks.push(match[1].trim());
  }

  // Extract JavaScript code blocks and wrap them in HTML
  const jsRegex = /```(?:javascript|js)\n([\s\S]*?)```/g;
  while ((match = jsRegex.exec(content)) !== null) {
    const jsCode = match[1].trim();
    // Wrap JavaScript in HTML with a container
    const wrappedHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    #app {
      width: 100%;
      max-width: 100%;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    ${jsCode}
  </script>
</body>
</html>
    `.trim();
    htmlBlocks.push(wrappedHtml);
  }

  return htmlBlocks;
}
