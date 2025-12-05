import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Image as ImageIcon, X } from 'lucide-react';
import { sendMessageStream, fileToBase64 } from '../services/claude';
import MessageContent from '../components/MessageContent';

interface Attachment {
  type: 'image' | 'document';
  url: string;
  file?: File;
  fileName?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  isStreaming?: boolean;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);

      if (file.type.startsWith('image/')) {
        newAttachments.push({
          type: 'image',
          url,
          file,
          fileName: file.name,
        });
      } else if (file.type === 'application/pdf') {
        newAttachments.push({
          type: 'document',
          url,
          file,
          fileName: file.name,
        });
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const newAttachments = [...prev];
      // Revoke object URL to free memory
      URL.revokeObjectURL(newAttachments[index].url);
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    // Create placeholder for streaming assistant message
    const assistantMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      },
    ]);

    try {
      // Convert messages to format expected by Claude API
      const conversationHistory = [...messages, userMessage].map(async (msg) => {
        // If message has image attachments, convert them
        if (msg.attachments && msg.attachments.length > 0) {
          const contentParts: any[] = [{ type: 'text', text: msg.content }];

          for (const attachment of msg.attachments) {
            if (attachment.type === 'image' && attachment.file) {
              try {
                const base64Data = await fileToBase64(attachment.file);
                contentParts.push({
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: attachment.file.type,
                    data: base64Data,
                  },
                });
              } catch (error) {
                console.error('Error converting image to base64:', error);
              }
            }
          }

          return {
            role: msg.role,
            content: contentParts,
          };
        }

        return {
          role: msg.role,
          content: msg.content,
        };
      });

      const resolvedHistory = await Promise.all(conversationHistory);

      // Call Claude API with streaming
      await sendMessageStream(
        resolvedHistory,
        // onChunk: Append text as it arrives
        (chunk: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        },
        // onComplete: Mark streaming as complete
        () => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, isStreaming: false }
                : msg
            )
          );
          setIsLoading(false);
        },
        // onError: Display error
        (error: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: `Error: ${error}`,
                    isStreaming: false,
                  }
                : msg
            )
          );
          setIsLoading(false);
        }
      );
    } catch (error) {
      // Handle any unexpected errors
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `Error: ${
                  error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred.'
                }`,
                isStreaming: false,
              }
            : msg
        )
      );
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-2xl">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Welcome to ConvoAI
                </h2>
                <p className="text-slate-600 max-w-md mx-auto">
                  Start a conversation with Claude. Upload images, documents, or
                  ask for visualizations and charts. Your AI assistant is ready to
                  help!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-6 py-4 shadow-md ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-1">
                          <svg
                            className="w-4 h-4 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-sm leading-relaxed">
                          <MessageContent
                            content={message.content}
                            attachments={message.attachments}
                          />
                          {message.isStreaming && (
                            <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                          )}
                        </div>
                        <p
                          className={`text-xs mt-2 ${
                            message.role === 'user'
                              ? 'text-blue-100'
                              : 'text-slate-400'
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="relative group bg-slate-100 border border-slate-200 rounded-lg p-2 flex items-center gap-2"
                >
                  {attachment.type === 'image' ? (
                    <img
                      src={attachment.url}
                      alt={attachment.fileName}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-red-100 rounded flex items-center justify-center text-red-600 text-xs font-bold">
                      PDF
                    </div>
                  )}
                  <span className="text-xs text-slate-600 max-w-[100px] truncate">
                    {attachment.fileName}
                  </span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative bg-white rounded-2xl shadow-lg border-2 border-slate-200 focus-within:border-blue-500 transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf"
              multiple
            />
            <div className="flex items-end gap-2 p-3">
              <button
                onClick={handleFileClick}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 flex-shrink-0"
                title="Attach file"
                disabled={isLoading}
              >
                <Paperclip size={20} />
              </button>
              <button
                onClick={handleFileClick}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 flex-shrink-0"
                title="Attach image"
                disabled={isLoading}
              >
                <ImageIcon size={20} />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                className="flex-1 resize-none outline-none px-3 py-2 max-h-32 text-slate-800 placeholder:text-slate-400"
                rows={1}
                style={{ minHeight: '40px' }}
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={(!input.trim() && attachments.length === 0) || isLoading}
                className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex-shrink-0"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center mt-3">
            Press Enter to send, Shift+Enter for new line • Upload images &amp;
            PDFs
          </p>
        </div>
      </div>
    </div>
  );
}
