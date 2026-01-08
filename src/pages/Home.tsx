import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Paperclip, X } from 'lucide-react';
import { sendMessageStream, sendMessage, fileToBase64 } from '../services/claude';
import MessageContent, { extractHtmlContent } from '../components/MessageContent';
import IframeRenderer from '../components/IframeRenderer';
import ImageViewer from '../components/ImageViewer';
import DocumentViewer from '../components/DocumentViewer';
import ErrorPopup from '../components/ErrorPopup';
import {
  createConversation,
  getConversation,
  updateConversation,
  setCurrentConversationId,
  getCurrentConversationId,
} from '../services/conversationStorage';
import {
  extractFileData,
  getSupportedFileTypes,
  isFileTypeSupported,
} from '../services/fileExtractor';

interface Attachment {
  type: 'image' | 'document' | 'spreadsheet' | 'text' | 'csv';
  url: string;
  file?: File;
  fileName?: string;
  extractedContent?: string;
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
  const [searchParams] = useSearchParams();
  const [currentConversationId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false); // Streaming disabled by default
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load or create conversation on mount and when URL changes
  useEffect(() => {
    const convIdFromUrl = searchParams.get('conv');
    const isNewConversation = searchParams.get('new') === 'true';

    if (convIdFromUrl) {
      // Load existing conversation
      const conversation = getConversation(convIdFromUrl);
      if (conversation) {
        setCurrentConvId(convIdFromUrl);
        setCurrentConversationId(convIdFromUrl);
        setMessages(conversation.messages);
      } else {
        // Conversation not found, create new one
        const newConv = createConversation();
        setCurrentConvId(newConv.id);
        setMessages([]);
      }
    } else if (isNewConversation) {
      // Explicitly creating a new conversation
      const newConv = createConversation();
      setCurrentConvId(newConv.id);
      setMessages([]);
    } else {
      // Check if there's a current conversation in storage
      const storedConvId = getCurrentConversationId();
      if (storedConvId) {
        const conversation = getConversation(storedConvId);
        if (conversation) {
          setCurrentConvId(storedConvId);
          setMessages(conversation.messages);
        } else {
          // Create new conversation
          const newConv = createConversation();
          setCurrentConvId(newConv.id);
          setMessages([]);
        }
      } else {
        // Create new conversation
        const newConv = createConversation();
        setCurrentConvId(newConv.id);
        setMessages([]);
      }
    }
  }, [searchParams]);

  // Save conversation when messages change
  useEffect(() => {
    if (currentConversationId && messages.length > 0) {
      updateConversation(currentConversationId, { messages });
    }
  }, [messages, currentConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check if file type is supported
      if (!isFileTypeSupported(file)) {
        alert(`File type not supported: ${file.name}`);
        continue;
      }

      const url = URL.createObjectURL(file);

      try {
        // Extract file content
        const extractedData = await extractFileData(file);

        // Determine attachment type
        let attachmentType: Attachment['type'] = 'document';
        if (file.type.startsWith('image/')) {
          attachmentType = 'image';
        } else if (file.name.endsWith('.csv') || file.type === 'text/csv') {
          attachmentType = 'csv';
        } else if (
          file.name.match(/\.(xls|xlsx)$/i) ||
          file.type.includes('spreadsheet')
        ) {
          attachmentType = 'spreadsheet';
        } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          attachmentType = 'text';
        }

        newAttachments.push({
          type: attachmentType,
          url,
          file,
          fileName: file.name,
          extractedContent: extractedData.content,
        });
      } catch (error) {
        console.error(`Error extracting file ${file.name}:`, error);
        alert(`Failed to process file: ${file.name}\n${(error as Error).message}`);
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

    // Create placeholder for assistant message
    const assistantMessageId = (Date.now() + 1).toString();

    try {
      // Convert messages to format expected by Claude API
      const conversationHistory = [...messages, userMessage].map(async (msg) => {
        // If message has attachments, process them
        if (msg.attachments && msg.attachments.length > 0) {
          const contentParts: any[] = [];

          // First, add extracted content from non-image files
          const extractedContents: string[] = [];
          for (const attachment of msg.attachments) {
            if (attachment.extractedContent && attachment.type !== 'image') {
              extractedContents.push(attachment.extractedContent);
            }
          }

          // Combine user message with extracted file contents
          let messageText = msg.content;
          if (extractedContents.length > 0) {
            messageText = `${extractedContents.join('\n\n---\n\n')}\n\n${msg.content}`;
          }

          contentParts.push({ type: 'text', text: messageText });

          // Then, add images
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

                // Also add OCR extracted text if available
                if (attachment.extractedContent) {
                  contentParts.push({
                    type: 'text',
                    text: `\n${attachment.extractedContent}`,
                  });
                }
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

      if (isStreaming) {
        // Streaming mode: Add placeholder and stream response
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
          // onError: Display error popup
          (error: string) => {
            // Remove the placeholder message
            setMessages((prev) =>
              prev.filter((msg) => msg.id !== assistantMessageId)
            );
            setIsLoading(false);
            setErrorMessage(error);
          }
        );
      } else {
        // Non-streaming mode: Wait for full response
        const response = await sendMessage(resolvedHistory);

        if (response.error) {
          // Show error popup instead of inline message
          setIsLoading(false);
          setErrorMessage(response.error);
          return;
        }

        const assistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: response.content || 'No response received.',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsLoading(false);
      }
    } catch (error) {
      // Handle any unexpected errors with popup
      setIsLoading(false);
      const errorMsg = error instanceof Error
        ? error.message
        : 'An unexpected error occurred. Please contact praveen.sonare@vflowtech.com for support.';
      setErrorMessage(errorMsg);
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

  const handlePremadeQuestion = (question: string) => {
    setInput(question);
    // Trigger send after input is set
    setTimeout(() => {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: question,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      // Create placeholder for assistant message
      const assistantMessageId = (Date.now() + 1).toString();

      // Convert messages to format expected by Claude API
      const conversationHistory = [...messages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      if (isStreaming) {
        // Streaming mode
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

        sendMessageStream(
          conversationHistory,
          (chunk: string) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              )
            );
          },
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
          (error: string) => {
            setMessages((prev) =>
              prev.filter((msg) => msg.id !== assistantMessageId)
            );
            setIsLoading(false);
            setErrorMessage(error);
          }
        );
      } else {
        // Non-streaming mode
        sendMessage(conversationHistory)
          .then((response) => {
            if (response.error) {
              setIsLoading(false);
              setErrorMessage(response.error);
              return;
            }

            const assistantMessage: Message = {
              id: assistantMessageId,
              role: 'assistant',
              content: response.content || 'No response received.',
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
            setIsLoading(false);
          })
          .catch((error) => {
            setIsLoading(false);
            const errorMsg = error instanceof Error
              ? error.message
              : 'An unexpected error occurred. Please contact praveen.sonare@vflowtech.com for support.';
            setErrorMessage(errorMsg);
          });
      }
    }, 0);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-6 max-w-2xl mx-auto">
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
                  Start a conversation with Claude. Upload files (images, PDFs,
                  Excel, CSV, text, PowerPoint) or ask for visualizations and
                  charts. Your AI assistant is ready to help!
                </p>

                {/* Premade Questions Section */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">
                    Quick Start Questions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={() => handlePremadeQuestion('I want to learn addition.')}
                      className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-300 rounded-xl text-left transition-all shadow-sm hover:shadow-md group"
                      disabled={isLoading}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <span className="text-slate-700 font-medium group-hover:text-blue-700">
                          I want to learn addition.
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => handlePremadeQuestion('I want to learn shapes')}
                      className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-2 border-purple-300 rounded-xl text-left transition-all shadow-sm hover:shadow-md group"
                      disabled={isLoading}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                        </div>
                        <span className="text-slate-700 font-medium group-hover:text-purple-700">
                          I want to learn shapes
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => handlePremadeQuestion('I want to learn alphabets')}
                      className="p-4 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-2 border-green-300 rounded-xl text-left transition-all shadow-sm hover:shadow-md group"
                      disabled={isLoading}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                        </div>
                        <span className="text-slate-700 font-medium group-hover:text-green-700">
                          I want to learn alphabets
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => handlePremadeQuestion('I want to play Country - capital and state capital for india.')}
                      className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border-2 border-orange-300 rounded-xl text-left transition-all shadow-sm hover:shadow-md group"
                      disabled={isLoading}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-slate-700 font-medium group-hover:text-orange-700">
                          Country - capital and state capital for India
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => {
                const htmlBlocks = extractHtmlContent(message.content);
                const hasHtml = htmlBlocks.length > 0;
                const hasAttachments = message.attachments && message.attachments.length > 0;

                return (
                  <div key={message.id} className="w-full">
                    {/* Full-width attachments for assistant messages - shown before text */}
                    {message.role === 'assistant' && hasAttachments && (
                      <div className="w-full mb-4">
                        {message.attachments!.map((attachment, idx) => {
                          if (attachment.type === 'image') {
                            return (
                              <ImageViewer
                                key={`att-${message.id}-${idx}`}
                                src={attachment.url}
                                fileName={attachment.fileName}
                                alt={attachment.fileName}
                              />
                            );
                          } else if (attachment.type === 'document') {
                            return (
                              <DocumentViewer
                                key={`att-${message.id}-${idx}`}
                                file={attachment.url}
                                fileName={attachment.fileName}
                              />
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}

                    {/* Text content in bubble */}
                    <div
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      } mb-3`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-4 py-3 shadow-sm ${
                          message.role === 'user'
                            ? 'bg-blue-50 border border-blue-200 text-slate-800'
                            : 'bg-white border border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {message.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                              <svg
                                className="w-5 h-5 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          {message.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                              <svg
                                className="w-5 h-5 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`leading-snug ${message.role === 'user' ? 'text-sm font-normal' : 'text-sm'}`}>
                              <MessageContent
                                content={message.content}
                                attachments={message.attachments}
                                role={message.role}
                              />
                              {message.isStreaming && (
                                <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                              )}
                            </div>
                            <p
                              className={`text-xs mt-1.5 ${
                                message.role === 'user'
                                  ? 'text-blue-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                          {message.role === 'user' && (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg
                                className="w-3 h-3 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Full-width HTML iframes for assistant messages */}
                    {message.role === 'assistant' && hasHtml && (
                      <div className="w-full">
                        {htmlBlocks.map((htmlCode, idx) => (
                          <IframeRenderer key={`html-${message.id}-${idx}`} htmlCode={htmlCode} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Loading indicator while AI is processing */}
              {isLoading && (
                <div className="w-full">
                  <div className="flex justify-start mb-4">
                    <div className="max-w-[80%] rounded-2xl px-6 py-4 shadow-md bg-white border border-slate-200 text-slate-800">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                          <svg
                            className="w-5 h-5 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
              {attachments.map((attachment, index) => {
                let bgColor = 'bg-blue-100';
                let textColor = 'text-blue-600';
                let label = 'FILE';

                if (attachment.type === 'document') {
                  bgColor = 'bg-red-100';
                  textColor = 'text-red-600';
                  label = 'PDF';
                } else if (attachment.type === 'spreadsheet') {
                  bgColor = 'bg-green-100';
                  textColor = 'text-green-600';
                  label = 'XLS';
                } else if (attachment.type === 'csv') {
                  bgColor = 'bg-yellow-100';
                  textColor = 'text-yellow-600';
                  label = 'CSV';
                } else if (attachment.type === 'text') {
                  bgColor = 'bg-gray-100';
                  textColor = 'text-gray-600';
                  label = 'TXT';
                }

                return (
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
                      <div
                        className={`w-12 h-12 ${bgColor} rounded flex items-center justify-center ${textColor} text-xs font-bold`}
                      >
                        {label}
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
                );
              })}
            </div>
          )}

          <div className="relative bg-white rounded-2xl shadow-lg border-2 border-slate-200 focus-within:border-blue-500 transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept={getSupportedFileTypes()}
              multiple
            />
            <div className="flex items-end gap-2 p-3">
              <button
                onClick={handleFileClick}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 flex-shrink-0"
                title="Attach files (images, PDFs, Excel, CSV, text, PowerPoint)"
                disabled={isLoading}
              >
                <Paperclip size={20} />
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
          <div className="flex items-center justify-between mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isStreaming}
                onChange={(e) => setIsStreaming(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-xs text-slate-600">
                Stream responses (real-time)
              </span>
            </label>
            <p className="text-xs text-slate-500">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* Error Popup */}
      {errorMessage && (
        <ErrorPopup
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}
    </div>
  );
}
