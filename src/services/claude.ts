import Anthropic from '@anthropic-ai/sdk';

export interface Message {
  role: 'user' | 'assistant';
  content: string | MessageContent[];
}

export interface MessageContent {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export interface ClaudeResponse {
  content: string;
  error?: string;
}

function getSystemPrompt(): string {
  const knowledgeBase = localStorage.getItem('knowledgeBase') || '';

  const systemPrompt = `You are UOB ConvoAI - an AI assistant for UOB Retail Leadership team. You help branch managers, relationship managers, and retail banking leaders with their day-to-day operations, strategic decisions, and team management.

CRITICAL RULES:
1. NO EXPLANATIONS: Never explain what you're about to generate. START DIRECTLY with the content.
2. NO PREAMBLE: Do not write "Here's...", "I've created...", "Let me show you...". Just output the content.
3. FOLLOW-UP CONTENT: When user clicks buttons, they will send a new message. You will then generate NEW content.
4. FULL WIDTH/HEIGHT: Use 100% width and height for all interactive visualizations.
5. TOKEN LIMIT: Each response MUST stay within 14000 tokens maximum.

RESPONSE FORMAT:
- Provide clear, actionable advice for retail banking leaders
- Use professional but accessible language
- Structure responses with clear headings and bullet points
- Include practical examples and frameworks where relevant
- For complex topics, use step-by-step guidance

AREAS OF EXPERTISE:
- Branch Operations: Queue management, staff scheduling, cash handling, vault management
- Customer Experience: Digital onboarding, retention strategies, NPS improvement
- Sales & Performance: Cross-selling, KPI tracking, target setting, coaching
- Compliance & Risk: AML, KYC, MAS guidelines, regulatory updates
- Team Leadership: Motivation, retention, performance management, one-on-ones
- Digital Transformation: Channel adoption, data analytics, personalization

When generating interactive content:
- Use clean, professional design suitable for banking executives
- Include data visualizations where helpful (charts, tables)
- Make content actionable with clear next steps
- Use UOB brand colors (blue #003087, red #E31937) where appropriate

${knowledgeBase ? `\n\nADDITIONAL KNOWLEDGE:\n${knowledgeBase}` : ''}
`.trim();

  return systemPrompt;
}

function getApiKey(): { key: string; shouldIncrementCounter: boolean } {
  const DEFAULT_API_KEY = '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';

  const userApiToken = localStorage.getItem('apiToken');

  if (userApiToken && userApiToken.trim() !== '') {
    return { key: userApiToken, shouldIncrementCounter: false };
  }

  const conversationCount = parseInt(localStorage.getItem('conversationCount') || '0', 10);

  if (conversationCount < 50) {
    return { key: DEFAULT_API_KEY, shouldIncrementCounter: true };
  }

  throw new Error('Free usage limit reached (50 conversations). Please set your API key in Settings or contact praveen.sonare@vflowtech.com for a key.');
}

function incrementConversationCounter(): void {
  const count = parseInt(localStorage.getItem('conversationCount') || '0', 10);
  localStorage.setItem('conversationCount', (count + 1).toString());
}

export async function sendMessageStream(
  messages: Message[],
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const { key: apiToken, shouldIncrementCounter } = getApiKey();

    const client = new Anthropic({
      apiKey: apiToken,
      dangerouslyAllowBrowser: true
    });

    const systemPrompt = getSystemPrompt();

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16384,
      system: systemPrompt ? [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" }
        }
      ] : undefined,
      messages: messages.map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : msg.content
      }))
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta') {
        onChunk(chunk.delta.text);
      }
    }

    if (shouldIncrementCounter) {
      incrementConversationCounter();
    }

    onComplete();
  } catch (error) {
    console.error('Claude API Error:', error);

    let errorMessage = 'An error occurred while communicating with Claude. Please contact praveen.sonare@vflowtech.com for support.';

    if (error instanceof Error) {
      errorMessage = error.message;
      if (!errorMessage.includes('vflowtech.com')) {
        errorMessage += '\n\nFor support, contact: praveen.sonare@vflowtech.com';
      }
    }

    onError(errorMessage);
  }
}

export async function sendMessage(
  messages: Message[]
): Promise<ClaudeResponse> {
  try {
    const { key: apiToken, shouldIncrementCounter } = getApiKey();

    const client = new Anthropic({
      apiKey: apiToken,
      dangerouslyAllowBrowser: true
    });

    const systemPrompt = getSystemPrompt();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16384,
      system: systemPrompt ? [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" }
        }
      ] : undefined,
      messages: messages.map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : msg.content
      }))
    });

    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => 'text' in block ? block.text : '')
      .join('');

    if (shouldIncrementCounter) {
      incrementConversationCounter();
    }

    return {
      content: textContent
    };
  } catch (error) {
    console.error('Claude API Error:', error);

    let errorMessage = 'An error occurred while communicating with Claude. Please contact praveen.sonare@vflowtech.com for support.';

    if (error instanceof Error) {
      errorMessage = error.message;
      if (!errorMessage.includes('vflowtech.com')) {
        errorMessage += '\n\nFor support, contact: praveen.sonare@vflowtech.com';
      }
    }

    return {
      content: '',
      error: errorMessage
    };
  }
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
