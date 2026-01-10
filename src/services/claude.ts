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

/**
 * Get the system prompt by combining userRole and knowledgeBase from localStorage
 */
function getSystemPrompt(): string {
  const userRole = localStorage.getItem('userRole') || '';
  const knowledgeBase = localStorage.getItem('knowledgeBase') || '';

  // Enhanced role instructions
  const enhancedInstructions = `
generate very precise, very short and clear responses. whenever possible explain with graphics.

Don't provide explanation, feature or reasoning of generating response unless user asked.

When possible to show information graphically (charts, tables, visualizations), generate interactive JavaScript/HTML code that can be rendered on web browser.

Try to make all graphical elements interactive with hover features and tooltips.

When generating charts and analytics:
- Use appropriate chart types based on data: bar charts, pie charts, line graphs, stacked bar charts, candlestick charts, etc.
- Make all visualizations responsive and mobile-friendly
- Add interactivity with mouse hover and screen touch features wherever possible

When user seeks quiz, puzzles, games or interactive elements:
- Generate mobile-friendly, responsive layout
- Create competitive experiences with different difficulty levels
- Make games engaging and interactive
- All CTAs (Call to Action buttons) shall be visible on screen without scrolling
- Use compact titles and optimize sized elements, spaces to fit in maximum elements
- Group all instructions/result at the bottom, keep interactive area clean
- Ensure all game controls and interactive elements fit within standard phone screens

When generating responses for emails, text, or messages:
- Provide precise and clear responses addressing all queries
- Be concise but comprehensive

For learning and educational content:
- Explain concepts in layman terms that are easy to understand
- Show visualizations whenever possible to illustrate the concept
- Use short, clear, and concise explanations
- Provide visual examples with animations in interactive sliding format
- Make learning engaging with step-by-step interactive demonstrations
- Use analogies and real-world examples to make complex topics simple

STRUCTURED LEARNING FLOW (for educational topics):
Learning shall be covered in 4 stages: Concept → Examples → Practice → Quiz

1. CONCEPT Stage:
   - Break down the concept into clear, digestible steps (3-5 steps recommended)
   - Display each step as a card/slide with left (←) and right (→) arrow navigation
   - Each step should be self-contained and easy to understand
   - Use visuals, diagrams, or animations where helpful
   - All content must fit on screen without scrolling
   - On the LAST step, show two buttons: "Explain Again" and "Go to Examples"
   - Clicking "Explain Again" restarts from step 1
   - Clicking "Go to Examples" moves to Examples stage

2. EXAMPLES Stage:
   - Show 2-3 practical examples demonstrating the concept
   - Each example on a separate slide with left (←) and right (→) navigation
   - Make examples relatable and easy to understand
   - Include visual representations where possible
   - All content must fit on screen without scrolling
   - On the LAST example, show two buttons: "More Examples" and "Go to Practice"
   - "More Examples" generates 2-3 additional examples (may require new API call)
   - "Go to Practice" moves to Practice stage

3. PRACTICE Stage:
   - Design as an interactive game/exercise
   - Present problems/questions where user inputs answers
   - Include input fields and "Check Answer" or "Verify" button for each question
   - Provide immediate feedback (correct/incorrect with explanations)
   - Use left (←) and right (→) navigation between practice questions
   - All interactive elements must fit on screen without scrolling
   - On the LAST practice question, show two buttons: "More Practice" and "Go to Quiz"
   - "More Practice" generates additional practice problems (may require new API call)
   - "Go to Quiz" moves to Quiz stage

4. QUIZ Stage:
   - Create quiz with three difficulty levels: Easy, Medium, Hard
   - Display score prominently at the top
   - Present questions one at a time with multiple choice or input options
   - All quiz elements must fit on screen without scrolling - no scrolling required
   - Track score as user progresses
   - Provide instant feedback after each answer
   - Show final score and summary at the end
   - Option to "Retake Quiz" or "Learn Another Topic"

IMPORTANT NOTES:
- Keep all interactive elements compact and visible without scrolling
- Use left/right arrow keys or buttons for navigation between slides/steps
- Each stage's last page may require a new API call when user requests more content
- Design should be mobile-friendly and responsive
- Use engaging colors, animations, and interactive elements to maintain interest
  `.trim();

  // Combine all parts
  const systemParts: string[] = [enhancedInstructions];

  if (userRole) {
    systemParts.push(userRole);
  }

  if (knowledgeBase) {
    systemParts.push(knowledgeBase);
  }

  return systemParts.join('\n\n');
}

/**
 * Get API key with default fallback for first 50 conversations
 */
function getApiKey(): { key: string; shouldIncrementCounter: boolean } {
  const DEFAULT_API_KEY = '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';

  // Check if user has set their own API key
  const userApiToken = localStorage.getItem('apiToken');

  if (userApiToken && userApiToken.trim() !== '') {
    return { key: userApiToken, shouldIncrementCounter: false };
  }

  // Use default key for first 50 conversations
  const conversationCount = parseInt(localStorage.getItem('conversationCount') || '0', 10);

  if (conversationCount < 50) {
    return { key: DEFAULT_API_KEY, shouldIncrementCounter: true };
  }

  // Limit reached
  throw new Error('Free usage limit reached (50 conversations). Please set your API key in Settings or contact praveen.sonare@vflowtech.com for a key.');
}

/**
 * Increment conversation counter
 */
function incrementConversationCounter(): void {
  const count = parseInt(localStorage.getItem('conversationCount') || '0', 10);
  localStorage.setItem('conversationCount', (count + 1).toString());
}

/**
 * Send a message to Claude API with streaming response
 */
export async function sendMessageStream(
  messages: Message[],
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    // Get API key (user's or default)
    const { key: apiToken, shouldIncrementCounter } = getApiKey();

    // Initialize Claude client
    const client = new Anthropic({
      apiKey: apiToken,
      dangerouslyAllowBrowser: true // Required for browser usage
    });

    // Get system prompt from userRole and knowledgeBase
    const systemPrompt = getSystemPrompt();

    // Make streaming API call to Claude
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16384,
      system: systemPrompt || undefined,
      messages: messages.map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : msg.content
      }))
    });

    // Process streaming chunks
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta') {
        onChunk(chunk.delta.text);
      }
    }

    // Increment counter if using default key
    if (shouldIncrementCounter) {
      incrementConversationCounter();
    }

    onComplete();
  } catch (error) {
    console.error('Claude API Error:', error);

    let errorMessage = 'An error occurred while communicating with Claude. Please contact praveen.sonare@vflowtech.com for support.';

    if (error instanceof Error) {
      errorMessage = error.message;
      // Add support contact for specific errors
      if (!errorMessage.includes('vflowtech.com')) {
        errorMessage += '\n\nFor support, contact: praveen.sonare@vflowtech.com';
      }
    }

    onError(errorMessage);
  }
}

/**
 * Send a message to Claude API and get a response (non-streaming)
 */
export async function sendMessage(
  messages: Message[]
): Promise<ClaudeResponse> {
  try {
    // Get API key (user's or default)
    const { key: apiToken, shouldIncrementCounter } = getApiKey();

    // Initialize Claude client
    const client = new Anthropic({
      apiKey: apiToken,
      dangerouslyAllowBrowser: true // Required for browser usage
    });

    // Get system prompt from userRole and knowledgeBase
    const systemPrompt = getSystemPrompt();

    // Make API call to Claude
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16384,
      system: systemPrompt || undefined, // Only include if not empty
      messages: messages.map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : msg.content
      }))
    });

    // Extract text content from response
    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => 'text' in block ? block.text : '')
      .join('');

    // Increment counter if using default key
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
      // Add support contact for specific errors
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

/**
 * Convert a file to base64 for Claude API
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove the data:image/png;base64, prefix
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
