import { useMemo } from 'react';
import ImageViewer from './ImageViewer';
import DocumentViewer from './DocumentViewer';
import CodeRenderer from './CodeRenderer';

interface MessageContentProps {
  content: string;
  attachments?: Array<{
    type: 'image' | 'document';
    url: string;
    fileName?: string;
  }>;
}

interface ParsedContent {
  type: 'text' | 'code';
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

    // Always treat as regular code block (graphical rendering disabled)
    parts.push({
      type: 'code',
      content: codeContent,
      language: language || 'text',
    });

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

export default function MessageContent({ content, attachments }: MessageContentProps) {
  const parsedContent = useMemo(() => {
    // Handle empty content
    if (!content || content.trim() === '') {
      return [];
    }
    return parseMessageContent(content);
  }, [content]);

  return (
    <div className="message-content">
      {/* Render attachments first */}
      {attachments && attachments.length > 0 && (
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
          <div key={index} className="whitespace-pre-wrap">
            {part.content}
          </div>
        );
      })}
    </div>
  );
}
