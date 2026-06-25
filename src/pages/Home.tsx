import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Paperclip, X } from 'lucide-react';
import { sendMessageStream, sendMessage } from '../services/claude';
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

// UOB Retail Leadership premade questions
const premadeQuestions = [
  {
    category: 'Branch Operations',
    questions: [
      'How can I improve branch queue management and reduce customer wait times?',
      'What are the best practices for branch staff scheduling during peak hours?',
      'How do I optimize cash handling and vault management processes?',
    ]
  },
  {
    category: 'Customer Experience',
    questions: [
      'How can we enhance digital onboarding for new retail customers?',
      'What strategies can improve customer retention in retail banking?',
      'How do we measure and improve Net Promoter Score (NPS) at branch level?',
    ]
  },
  {
    category: 'Sales & Performance',
    questions: [
      'How can I coach my team to cross-sell wealth products effectively?',
      'What KPIs should I track for branch sales performance?',
      'How do I set realistic sales targets for my relationship managers?',
    ]
  },
  {
    category: 'Compliance & Risk',
    questions: [
      'What are the key AML red flags I should train my staff to watch for?',
      'How do I ensure proper KYC documentation for new accounts?',
      'What are the latest MAS guidelines for retail banking operations?',
    ]
  },
  {
    category: 'Team Leadership',
    questions: [
      'How can I motivate and retain high-performing branch staff?',
      'What are effective one-on-one conversation frameworks for my team?',
      'How do I handle underperforming team members constructively?',
    ]
  },
  {
    category: 'Digital Transformation',
    questions: [
      'How do we drive adoption of digital banking channels among elderly customers?',
      'What is the right balance between digital and in-person service?',
      'How can we use data analytics to personalize customer offerings?',
    ]
  },
];

const categoryColors: Record<string, string> = {
  'Branch Operations': 'from-blue-50 to-blue-100 border-blue-300 hover:from-blue-100 hover:to-blue-200',
  'Customer Experience': 'from-green-50 to-green-100 border-green-300 hover:from-green-100 hover:to-green-200',
  'Sales & Performance': 'from-amber-50 to-amber-100 border-amber-300 hover:from-amber-100 hover:to-amber-200',
  'Compliance & Risk': 'from-red-50 to-red-100 border-red-300 hover:from-red-100 hover:to-red-200',
  'Team Leadership': 'from-purple-50 to-purple-100 border-purple-300 hover:from-purple-100 hover:to-purple-200',
  'Digital Transformation': 'from-teal-50 to-teal-100 border-teal-300 hover:from-teal-100 hover:to-teal-200',
};

export default function Home() {
  const [searchParams] = useSearchParams();
  const [currentConversationId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isStreaming = localStorage.getItem('isStreaming') === 'true';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load or create conversation on mount and when URL changes
  useEffect(() => {
    const convIdFromUrl = searchParams.get('conv');
    const isNewConversation = searchParams.get('new') === 'true';
    const showWelcome = searchParams.get('welcome') === 'true';

    if (showWelcome) {
      setCurrentConvId(null);
      setMessages([]);
      setSelectedCategory(null);
      return;
    }

    if (convIdFromUrl) {
      const conversation = getConversation(convIdFromUrl);
      if (conversation) {
        setCurrentConvId(convIdFromUrl);
        setCurrentConversationId(convIdFromUrl);
        setMessages(conversation.messages);
      } else {
        const newConv = createConversation();
        setCurrentConvId(newConv.id);
        setMessages([]);
      }
    } else if (isNewConversation) {
      const newConv = createConversation();
      setCurrentConvId(newConv.id);
      setMessages([]);
    } else {
      const storedConvId = getCurrentConversationId();
      if (storedConvId) {
        const conversation = getConversation(storedConvId);
        if (conversation) {
          setCurrentConvId(storedConvId);
          setMessages(conversation.messages);
        } else {
          const newConv = createConversation();
          setCurrentConvId(newConv.id);
          setMessages([]);
        }
      } else {
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

      if (!isFileTypeSupported(file)) {
        alert(`File type not supported: ${file.name}`);
        continue;
      }

      const url = URL.createObjectURL(file);

      try {
        const extractedData = await extractFileData(file);

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

    const assistantMessageId = (Date.now() + 1).toString();

    try {
      const conversationHistory = [...messages, userMessage].map(async (msg) => {
        if (msg.attachments && msg.attachments.length > 0) {
          const contentParts: any[] = [];
          const extractedContents: string[] = [];
          for (const attachment of msg.attachments) {
            if (attachment.extractedContent && attachment.type !== 'image') {
              extractedContents.push(attachment.extractedContent);
            }
          }

          let messageText = msg.content;
          if (extractedContents.length > 0) {
            messageText = `${extractedContents.join('\n\n---\n\n')}\n\n${msg.content}`;
          }

          contentParts.push({ type: 'text', text: messageText });

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
        const response = await sendMessage(resolvedHistory);

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
      }
    } catch (error) {
      setIsLoading(false);
      const errorMsg = error instanceof Error
        ? error.message
        : 'An unexpected error occurred. Please try again.';
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

  // Handle button clicks from interactive content
  const handleInteractiveButtonClick = (buttonText: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: buttonText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();

    setTimeout(async () => {
      try {
        const conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [
          ...messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          {
            role: 'user',
            content: buttonText,
          },
        ];

        if (isStreaming) {
          let streamedContent = '';
          const assistantMessage: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
          };
          setMessages((prev) => [...prev, assistantMessage]);

          await sendMessageStream(
            conversationHistory,
            (chunk: string) => {
              streamedContent += chunk;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: streamedContent }
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
          const response = await sendMessage(conversationHistory);

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
        }
      } catch (error) {
        setIsLoading(false);
        const errorMsg = error instanceof Error
          ? error.message
          : 'An unexpected error occurred. Please try again.';
        setErrorMessage(errorMsg);
      }
    }, 0);
  };

  const handlePremadeQuestion = (question: string) => {
    setInput(question);
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

      const assistantMessageId = (Date.now() + 1).toString();

      const conversationHistory = [...messages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      if (isStreaming) {
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
              : 'An unexpected error occurred. Please try again.';
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
              <div className="text-center space-y-6 max-w-4xl mx-auto px-4">
                {/* UOB Header */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-2xl">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800">
                  UOB Retail Leadership Assistant
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-slate-600 px-4">
                  Hello! How can I help you with your branch operations today?
                </p>

                {/* Premade Questions */}
                {!selectedCategory ? (
                  <div className="mt-8 w-full">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-4 sm:mb-6">
                      Choose a Topic
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                      {premadeQuestions.map((item) => (
                        <button
                          key={item.category}
                          onClick={() => setSelectedCategory(item.category)}
                          className={`py-4 px-4 bg-gradient-to-br ${categoryColors[item.category]} border-2 rounded-xl text-center transition-all shadow-sm hover:shadow-md hover:scale-105`}
                          disabled={isLoading}
                        >
                          <span className="text-sm sm:text-base font-semibold text-slate-700 block">
                            {item.category}
                          </span>
                          <span className="text-xs text-slate-500 block mt-1">
                            {item.questions.length} questions
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 w-full">
                    <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                      >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Topics
                      </button>
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-4 sm:mb-6">
                      {selectedCategory}
                    </h3>
                    <div className="space-y-3 max-w-2xl mx-auto">
                      {premadeQuestions
                        .find((q) => q.category === selectedCategory)
                        ?.questions.map((question, idx) => (
                          <button
                            key={idx}
                            onClick={() => handlePremadeQuestion(question)}
                            className="w-full text-left py-3 px-4 bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm hover:shadow-md"
                            disabled={isLoading}
                          >
                            <span className="text-sm text-slate-700">{question}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
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
                    {/* Full-width attachments for assistant messages */}
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
                          {message.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
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
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
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
                          <IframeRenderer
                            key={`html-${message.id}-${idx}`}
                            htmlCode={htmlCode}
                            onButtonClick={handleInteractiveButtonClick}
                            topic={selectedCategory || undefined}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Loading indicator */}
              {isLoading && (
                <div className="w-full">
                  <div className="flex justify-start mb-4">
                    <div className="max-w-[80%] rounded-2xl px-6 py-4 shadow-md bg-white border border-slate-200 text-slate-800">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
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
                className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex-shrink-0"
              >
                <Send size={20} />
              </button>
            </div>
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
