import Anthropic from '@anthropic-ai/sdk';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  error?: string;
}

/**
 * Get the system prompt by combining userRole and knowledgeBase from localStorage
 */
function getSystemPrompt(): string {
  const userRole = localStorage.getItem('userRole') || '';
  const knowledgeBase = localStorage.getItem('knowledgeBase') || '';

  // Combine userRole and knowledgeBase for the system message
  const systemParts: string[] = [];

  if (userRole) {
    systemParts.push(userRole);
  }

  if (knowledgeBase) {
    systemParts.push(knowledgeBase);
  }

  return systemParts.join('\n\n');
}

/**
 * Send a message to Claude API and get a response
 */
export async function sendMessage(
  messages: Message[]
): Promise<ClaudeResponse> {
  try {
    // Get API token from localStorage
    const apiToken = localStorage.getItem('apiToken');

    if (!apiToken) {
      return {
        content: '',
        error: 'API token not found. Please set your API token in Settings.'
      };
    }

    // Initialize Claude client
    const client = new Anthropic({
      apiKey: apiToken,
      dangerouslyAllowBrowser: true // Required for browser usage
    });

    // Get system prompt from userRole and knowledgeBase
    const systemPrompt = getSystemPrompt();

    // Make API call to Claude
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 8192,
      system: systemPrompt || undefined, // Only include if not empty
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    });

    // Extract text content from response
    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => 'text' in block ? block.text : '')
      .join('');

    return {
      content: textContent
    };
  } catch (error) {
    console.error('Claude API Error:', error);

    let errorMessage = 'An error occurred while communicating with Claude.';

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      content: '',
      error: errorMessage
    };
  }
}
