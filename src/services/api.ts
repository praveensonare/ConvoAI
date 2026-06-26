const API_BASE_URL = 'http://localhost:8080/api/v1';

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

export interface ApiResponse {
  content: string;
  error?: string;
}

function getSystemPrompt(): string {
  const knowledgeBase = localStorage.getItem('knowledgeBase') || '';

  return `You are PulseAI - an AI assistant for UOB Retail Leadership team. You help branch managers, relationship managers, and retail banking leaders with their day-to-day operations, strategic decisions, and team management.

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
}

function normalizeMessages(messages: Message[]): { role: string; content: string }[] {
  const systemPrompt = getSystemPrompt();
  const normalized = [];

  if (systemPrompt) {
    normalized.push({ role: 'system', content: systemPrompt });
  }

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      normalized.push({ role: msg.role, content: msg.content });
    } else {
      const textParts = msg.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text || '')
        .join('\n');
      normalized.push({ role: msg.role, content: textParts });
    }
  }

  return normalized;
}

export async function sendMessage(messages: Message[]): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: normalizeMessages(messages) }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    const content =
      data.choices?.[0]?.message?.content ||
      data.content ||
      data.response ||
      data.message ||
      '';

    return { content };
  } catch (error) {
    console.error('API Error:', error);
    return {
      content: '',
      error:
        error instanceof Error
          ? error.message
          : 'An error occurred while calling the API.',
    };
  }
}

export async function sendMessageStream(
  messages: Message[],
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ messages: normalizeMessages(messages), stream: true }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    if (!reader) {
      throw new Error('No response body available for streaming');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          try {
            const jsonStr = trimmed.slice(6);
            const parsed = JSON.parse(jsonStr);
            const chunk =
              parsed.choices?.[0]?.delta?.content ||
              parsed.choices?.[0]?.message?.content ||
              parsed.content ||
              '';
            if (chunk) onChunk(chunk);
          } catch {
            // ignore malformed SSE data
          }
        }
      }
    }

    onComplete();
  } catch (error) {
    console.error('API Stream Error:', error);
    onError(
      error instanceof Error
        ? error.message
        : 'An error occurred while streaming the response.'
    );
  }
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
