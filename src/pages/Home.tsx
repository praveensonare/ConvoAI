import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Send, Paperclip, X } from 'lucide-react';
import { sendMessageStream, sendMessage, fileToBase64 } from '../services/claude';
import MessageContent, { extractHtmlContent } from '../components/MessageContent';
import IframeRenderer from '../components/IframeRenderer';
import ImageViewer from '../components/ImageViewer';
import DocumentViewer from '../components/DocumentViewer';
import ErrorPopup from '../components/ErrorPopup';
import WhatsAppPopup from '../components/WhatsAppPopup';
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
  const navigate = useNavigate();
  const [currentConversationId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showWhatsAppPopup, setShowWhatsAppPopup] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [showHomeworkInput, setShowHomeworkInput] = useState(false);
  const [homeworkText, setHomeworkText] = useState('');
  const [nameInput, setNameInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const homeworkFileInputRef = useRef<HTMLInputElement>(null);

  // Get authentication status and message count
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const userMessageCount = parseInt(localStorage.getItem('userMessageCount') || '0', 10);

  // Get streaming setting from localStorage
  const isStreaming = localStorage.getItem('isStreaming') === 'true';

  // Subject and topics data
  const subjectsData: Record<string, string[]> = {
    'Mathematics': ['Numbers', 'Addition', 'Subtraction', 'Multiplication', 'Division', 'Fractions', 'Decimals', 'Measurement', 'Shapes', 'Data'],
    'Science': ['Animals', 'Plants', 'Human Body', 'Materials', 'Matter', 'Forces', 'Light', 'Sound', 'Space', 'Experiments'],
    'English': ['Phonics', 'Reading', 'Vocabulary', 'Grammar', 'Punctuation', 'Writing', 'Speaking', 'Listening', 'Spelling', 'Poetry'],
    'Chinese': ['Pinyin', 'Characters', 'Reading', 'Writing', 'Vocabulary', 'Grammar', 'Listening', 'Speaking', 'Culture', 'Stories'],
    'Spanish': ['Alphabet', 'Vocabulary', 'Sentences', 'Verbs', 'Reading', 'Writing', 'Listening', 'Speaking', 'Culture', 'Stories'],
    'German': ['Alphabet', 'Vocabulary', 'Articles', 'Sentences', 'Verbs', 'Reading', 'Writing', 'Listening', 'Speaking', 'Culture'],
    'Hindi': ['Script', 'Reading', 'Writing', 'Vocabulary', 'Sentences', 'Grammar', 'Listening', 'Speaking', 'Stories', 'Culture'],
    'History': ['Community', 'Civilizations', 'Figures', 'Events', 'Timelines', 'Changes', 'Royalty', 'Past Life', 'Sources', 'Heritage'],
    'Geography': ['Maps', 'Continents', 'Countries', 'Features', 'Weather', 'Climate', 'Cities', 'Resources', 'Culture', 'Fieldwork'],
    'Computing': ['Basics', 'Keyboard', 'Word Processing', 'Research', 'Safety', 'Coding', 'Content', 'Data', 'Presentations', 'Problems']
  };

  // Subject colors for buttons
  const subjectColors: Record<string, { bg: string; hover: string; border: string; icon: string }> = {
    'Mathematics': { bg: 'from-blue-50 to-blue-100', hover: 'hover:from-blue-100 hover:to-blue-200', border: 'border-blue-300', icon: 'bg-blue-500' },
    'Science': { bg: 'from-green-50 to-green-100', hover: 'hover:from-green-100 hover:to-green-200', border: 'border-green-300', icon: 'bg-green-500' },
    'English': { bg: 'from-purple-50 to-purple-100', hover: 'hover:from-purple-100 hover:to-purple-200', border: 'border-purple-300', icon: 'bg-purple-500' },
    'Chinese': { bg: 'from-red-50 to-red-100', hover: 'hover:from-red-100 hover:to-red-200', border: 'border-red-300', icon: 'bg-red-500' },
    'Spanish': { bg: 'from-yellow-50 to-yellow-100', hover: 'hover:from-yellow-100 hover:to-yellow-200', border: 'border-yellow-300', icon: 'bg-yellow-500' },
    'German': { bg: 'from-gray-50 to-gray-100', hover: 'hover:from-gray-100 hover:to-gray-200', border: 'border-gray-300', icon: 'bg-gray-500' },
    'Hindi': { bg: 'from-orange-50 to-orange-100', hover: 'hover:from-orange-100 hover:to-orange-200', border: 'border-orange-300', icon: 'bg-orange-500' },
    'History': { bg: 'from-amber-50 to-amber-100', hover: 'hover:from-amber-100 hover:to-amber-200', border: 'border-amber-300', icon: 'bg-amber-500' },
    'Geography': { bg: 'from-teal-50 to-teal-100', hover: 'hover:from-teal-100 hover:to-teal-200', border: 'border-teal-300', icon: 'bg-teal-500' },
    'Computing': { bg: 'from-indigo-50 to-indigo-100', hover: 'hover:from-indigo-100 hover:to-indigo-200', border: 'border-indigo-300', icon: 'bg-indigo-500' }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check if user can send message based on message count and authentication
  const canSendMessage = (): { canSend: boolean; reason?: string } => {
    if (!isAuthenticated) {
      // First 7 messages are free without login
      if (userMessageCount >= 7) {
        return { canSend: false, reason: 'login_required' };
      }
      return { canSend: true };
    }

    // After login, allow up to 40 messages
    if (userMessageCount >= 40) {
      return { canSend: false, reason: 'upgrade_required' };
    }

    return { canSend: true };
  };

  // Increment user message count
  const incrementMessageCount = () => {
    const count = parseInt(localStorage.getItem('userMessageCount') || '0', 10);
    localStorage.setItem('userMessageCount', (count + 1).toString());
  };

  // Handle login redirect
  const handleLoginRedirect = () => {
    setShowLoginPrompt(false);
    navigate('/login');
  };

  // Handle subject selection
  const handleSubjectSelect = (subject: string) => {
    setSelectedSubject(subject);
    setSelectedTopic(null);
  };

  // Handle topic selection - show stage buttons
  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    setSelectedStage(null); // Reset stage selection
  };

  // Handle stage selection and start learning
  const handleStageSelect = (stage: string) => {
    setSelectedStage(stage);

    // Check if user has entered name
    const userName = localStorage.getItem('userName');
    if (!userName) {
      setShowNamePrompt(true);
      return;
    }

    // For Homework, show the homework input modal
    if (stage === 'Homework') {
      setShowHomeworkInput(true);
      return;
    }

    // Start the learning conversation with selected stage
    let learningMessage = '';
    switch(stage) {
      case 'Guided Learning':
        learningMessage = `I want to learn about ${selectedTopic} in ${selectedSubject}. Start with the concept.`;
        break;
      case 'Concept':
        learningMessage = `Teach me the concept of ${selectedTopic} in ${selectedSubject}.`;
        break;
      case 'Examples':
        learningMessage = `Show me examples of ${selectedTopic} in ${selectedSubject}.`;
        break;
      case 'Practice':
        learningMessage = `I want to practice ${selectedTopic} in ${selectedSubject}.`;
        break;
      case 'Quiz':
        learningMessage = `Give me a quiz on ${selectedTopic} in ${selectedSubject}.`;
        break;
      default:
        learningMessage = `I want to learn about ${selectedTopic} in ${selectedSubject}.`;
    }
    handlePremadeQuestion(learningMessage);
  };

  // Handle name submission
  const handleNameSubmit = () => {
    if (nameInput.trim()) {
      localStorage.setItem('userName', nameInput.trim());
      setShowNamePrompt(false);

      // Now start the learning conversation with selected stage
      if (selectedTopic && selectedSubject && selectedStage) {
        handleStageSelect(selectedStage);
      }
    }
  };

  // Handle homework file selection
  const handleHomeworkFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file type is supported
    if (!isFileTypeSupported(file)) {
      alert(`File type not supported: ${file.name}`);
      return;
    }

    try {
      // Extract file content
      const extractedData = await extractFileData(file);

      // Start homework conversation with file content
      const homeworkMessage = `I need help with my homework on ${selectedTopic} in ${selectedSubject}. Here are the problems:\n\n${extractedData}`;
      setShowHomeworkInput(false);
      handlePremadeQuestion(homeworkMessage);
    } catch (error) {
      console.error('Error reading homework file:', error);
      alert('Error reading file. Please try again.');
    }
  };

  // Handle homework text submission
  const handleHomeworkTextSubmit = () => {
    if (homeworkText.trim()) {
      const homeworkMessage = `I need help with my homework on ${selectedTopic} in ${selectedSubject}. Here are the problems:\n\n${homeworkText.trim()}`;
      setShowHomeworkInput(false);
      setHomeworkText('');
      handlePremadeQuestion(homeworkMessage);
    }
  };

  // Reset to subject selection
  const handleBackToSubjects = () => {
    setSelectedSubject(null);
    setSelectedTopic(null);
    setSelectedStage(null);
  };

  // Reset to topic selection (from stage selection)
  const handleBackToTopics = () => {
    setSelectedTopic(null);
    setSelectedStage(null);
  };

  // Load or create conversation on mount and when URL changes
  useEffect(() => {
    const convIdFromUrl = searchParams.get('conv');
    const isNewConversation = searchParams.get('new') === 'true';
    const showWelcome = searchParams.get('welcome') === 'true';

    if (showWelcome) {
      // Reset to welcome screen
      setCurrentConvId(null);
      setMessages([]);
      setSelectedSubject(null);
      setSelectedTopic(null);
      setSelectedStage(null);
      return;
    }

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

    // Check if user can send message
    const messageCheck = canSendMessage();
    if (!messageCheck.canSend) {
      if (messageCheck.reason === 'login_required') {
        // Show login prompt for users who have sent 7 messages
        setShowLoginPrompt(true);
        return;
      } else if (messageCheck.reason === 'upgrade_required') {
        // Show WhatsApp popup for users who have sent 40 messages
        setShowWhatsAppPopup(true);
        return;
      }
    }

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

    // Increment message count
    incrementMessageCount();

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

  // Handle button clicks from interactive content
  const handleInteractiveButtonClick = (buttonText: string) => {
    // Check if user can send message
    const messageCheck = canSendMessage();
    if (!messageCheck.canSend) {
      if (messageCheck.reason === 'login_required') {
        setShowLoginPrompt(true);
        return;
      } else if (messageCheck.reason === 'upgrade_required') {
        setShowWhatsAppPopup(true);
        return;
      }
    }

    // Create user message with button text
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: buttonText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Increment message count
    incrementMessageCount();

    // Create placeholder for assistant message
    const assistantMessageId = (Date.now() + 1).toString();

    // Prepare conversation history
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
          // Streaming mode
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
          // Non-streaming mode
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
          : 'An unexpected error occurred. Please contact praveen.sonare@vflowtech.com for support.';
        setErrorMessage(errorMsg);
      }
    }, 0);
  };

  const handlePremadeQuestion = (question: string) => {
    // Check if user can send message
    const messageCheck = canSendMessage();
    if (!messageCheck.canSend) {
      if (messageCheck.reason === 'login_required') {
        setShowLoginPrompt(true);
        return;
      } else if (messageCheck.reason === 'upgrade_required') {
        setShowWhatsAppPopup(true);
        return;
      }
    }

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

      // Increment message count
      incrementMessageCount();

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
              <div className="text-center space-y-6 max-w-4xl mx-auto px-4">
                {/* AZ Tutor Header */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800">
                  I'm your AZ Tutor
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-slate-600 px-4">
                  Hello! What would you like to learn today?
                </p>

                {/* Show Subject Selection, Topic Selection, or Stage Selection */}
                {!selectedSubject ? (
                  <div className="mt-8 w-full">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-4 sm:mb-6">
                      Choose a Subject
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                      {Object.keys(subjectsData).map((subject) => {
                        const colors = subjectColors[subject];
                        return (
                          <button
                            key={subject}
                            onClick={() => handleSubjectSelect(subject)}
                            className={`py-3 px-2 sm:px-4 bg-gradient-to-br ${colors.bg} ${colors.hover} border-2 ${colors.border} rounded-xl text-center transition-all shadow-sm hover:shadow-md hover:scale-105`}
                            disabled={isLoading}
                          >
                            <span className="text-xs sm:text-sm font-semibold text-slate-700 block">
                              {subject}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : !selectedTopic ? (
                  <div className="mt-8 w-full">
                    <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6">
                      <button
                        onClick={handleBackToSubjects}
                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                      >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Subjects
                      </button>
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-4 sm:mb-6">
                      Select a Topic in {selectedSubject}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                      {subjectsData[selectedSubject].map((topic) => {
                        const colors = subjectColors[selectedSubject];
                        return (
                          <button
                            key={topic}
                            onClick={() => handleTopicSelect(topic)}
                            className={`py-2.5 px-2 sm:px-3 bg-gradient-to-br ${colors.bg} ${colors.hover} border-2 ${colors.border} rounded-lg text-center transition-all shadow-sm hover:shadow-md hover:scale-105`}
                            disabled={isLoading}
                          >
                            <span className="text-xs sm:text-sm font-medium text-slate-700 block leading-tight">
                              {topic}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 w-full">
                    <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6">
                      <button
                        onClick={handleBackToTopics}
                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                      >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Topics
                      </button>
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-4 sm:mb-6">
                      How would you like to learn {selectedTopic}?
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 max-w-5xl mx-auto">
                      <button
                        onClick={() => handleStageSelect('Guided Learning')}
                        className="py-4 px-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-2 border-purple-300 rounded-xl text-center transition-all shadow-md hover:shadow-lg hover:scale-105"
                        disabled={isLoading}
                      >
                        <div className="text-3xl mb-2">🎓</div>
                        <span className="text-sm font-semibold text-slate-700 block">Guided Learning</span>
                        <span className="text-xs text-slate-500 block mt-1">Start from basics</span>
                      </button>
                      <button
                        onClick={() => handleStageSelect('Concept')}
                        className="py-4 px-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-300 rounded-xl text-center transition-all shadow-md hover:shadow-lg hover:scale-105"
                        disabled={isLoading}
                      >
                        <div className="text-3xl mb-2">💡</div>
                        <span className="text-sm font-semibold text-slate-700 block">Concept</span>
                        <span className="text-xs text-slate-500 block mt-1">Learn the idea</span>
                      </button>
                      <button
                        onClick={() => handleStageSelect('Examples')}
                        className="py-4 px-4 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-2 border-green-300 rounded-xl text-center transition-all shadow-md hover:shadow-lg hover:scale-105"
                        disabled={isLoading}
                      >
                        <div className="text-3xl mb-2">📚</div>
                        <span className="text-sm font-semibold text-slate-700 block">Examples</span>
                        <span className="text-xs text-slate-500 block mt-1">See it in action</span>
                      </button>
                      <button
                        onClick={() => handleStageSelect('Practice')}
                        className="py-4 px-4 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border-2 border-orange-300 rounded-xl text-center transition-all shadow-md hover:shadow-lg hover:scale-105"
                        disabled={isLoading}
                      >
                        <div className="text-3xl mb-2">✏️</div>
                        <span className="text-sm font-semibold text-slate-700 block">Practice</span>
                        <span className="text-xs text-slate-500 block mt-1">Try it yourself</span>
                      </button>
                      <button
                        onClick={() => handleStageSelect('Quiz')}
                        className="py-4 px-4 bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 border-2 border-red-300 rounded-xl text-center transition-all shadow-md hover:shadow-lg hover:scale-105"
                        disabled={isLoading}
                      >
                        <div className="text-3xl mb-2">🎯</div>
                        <span className="text-sm font-semibold text-slate-700 block">Quiz</span>
                        <span className="text-xs text-slate-500 block mt-1">Test yourself</span>
                      </button>
                      <button
                        onClick={() => handleStageSelect('Homework')}
                        className="py-4 px-4 bg-gradient-to-br from-pink-50 to-pink-100 hover:from-pink-100 hover:to-pink-200 border-2 border-pink-300 rounded-xl text-center transition-all shadow-md hover:shadow-lg hover:scale-105"
                        disabled={isLoading}
                      >
                        <div className="text-3xl mb-2">📝</div>
                        <span className="text-sm font-semibold text-slate-700 block">Homework</span>
                        <span className="text-xs text-slate-500 block mt-1">Get help</span>
                      </button>
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
                          <IframeRenderer
                            key={`html-${message.id}-${idx}`}
                            htmlCode={htmlCode}
                            onButtonClick={handleInteractiveButtonClick}
                            topic={selectedTopic || undefined}
                          />
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
        </div>
      </div>

      {/* Error Popup */}
      {errorMessage && (
        <ErrorPopup
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}

      {/* Login Prompt */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-fade-in">
            <button
              onClick={() => setShowLoginPrompt(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Login Required
              </h2>

              <p className="text-slate-600 mb-6">
                You've used your 7 free messages! Please log in to continue chatting with ConvoAI and get 40 messages total.
              </p>

              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-4 mb-6">
                <p className="text-sm font-semibold text-green-800 mb-2">After Login:</p>
                <ul className="text-xs text-green-700 space-y-1 text-left">
                  <li>✓ 40 total free messages</li>
                  <li>✓ Save your conversations</li>
                  <li>✓ Access from any device</li>
                  <li>✓ Personalized experience</li>
                </ul>
              </div>

              <button
                onClick={handleLoginRedirect}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Name Prompt */}
      {showNamePrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-fade-in">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-400 to-blue-600 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                What's your name?
              </h2>

              <p className="text-slate-600 mb-6">
                Let me know your name so I can make learning more personal and fun! 🎓
              </p>

              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && nameInput.trim()) {
                    handleNameSubmit();
                  }
                }}
                placeholder="Enter your name..."
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none mb-4 text-center text-lg"
                autoFocus
              />

              <button
                onClick={handleNameSubmit}
                disabled={!nameInput.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                Start Learning! 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Homework Input Modal */}
      {showHomeworkInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative animate-fade-in">
            <button
              onClick={() => setShowHomeworkInput(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Upload Your Homework
              </h2>

              <p className="text-slate-600 mb-4">
                I'll help you solve each problem step by step! 📚
              </p>
            </div>

            {/* File Upload Option */}
            <div className="mb-6">
              <input
                type="file"
                ref={homeworkFileInputRef}
                onChange={handleHomeworkFileSelect}
                className="hidden"
                accept={getSupportedFileTypes()}
              />
              <button
                onClick={() => homeworkFileInputRef.current?.click()}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Document or Image
              </button>
              <p className="text-xs text-slate-500 text-center mt-2">PDF, Word, Image, Excel, or Text files</p>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-500">OR</span>
              </div>
            </div>

            {/* Text Input Option */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Paste your homework questions:</label>
              <textarea
                value={homeworkText}
                onChange={(e) => setHomeworkText(e.target.value)}
                placeholder="Example:
1. What is 5 + 3?
2. Solve: 12 - 7 = ?
3. Calculate: 4 × 6"
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none min-h-[150px] text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <button
              onClick={handleHomeworkTextSubmit}
              disabled={!homeworkText.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              Start Homework Help 🚀
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Popup for upgrade */}
      {showWhatsAppPopup && (
        <WhatsAppPopup onClose={() => setShowWhatsAppPopup(false)} />
      )}
    </div>
  );
}
