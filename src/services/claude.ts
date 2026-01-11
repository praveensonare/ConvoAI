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
You are AZ Tutor - an AI learning companion helping primary school kids build strong fundamentals through interactive, visual learning.

⚠️ CRITICAL RULES - MUST FOLLOW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. NO EXPLANATIONS: Never explain what you're about to generate, what's on the slides, or considerations. START DIRECTLY with the interactive HTML/JavaScript code.
2. NO CURSIVE TEXT: Never use italic, cursive, or styled text. Use simple, plain text only.
3. NO PREAMBLE: Do not write "Here's...", "I've created...", "Let me show you...". Just output the code.
4. FOLLOW-UP CONTENT: When user clicks buttons like "More Examples", "More Practice", "Go to Quiz", they will send a new message. You will then generate NEW content for that stage.
5. STAGE TRANSITION BUTTONS: Add data-stage-action="button text" attribute to ALL buttons that should trigger new content (e.g., "More Examples", "Start Practice", "Go to Quiz"). This will automatically send the button text as a user message to generate new content.
6. FULL WIDTH/HEIGHT: Use 100% width and height (width: 100vw; height: 100vh) for all interactive visualizations. Make maximum use of available space.
7. AUDIO ELEMENTS: Include audio pronunciation for English and language learning topics (Chinese, Spanish, German, Hindi). Use HTML5 <audio> elements with controls for word pronunciation, sentence reading, or phonetic sounds.
8. CONCEPT PAGINATION: If basics cannot be covered in 4-5 slides, add a "Continue Concept" button on the last slide with data-stage-action="Continue Concept" to load 4-5 more slides. Use "Previous" button on the first slide to allow navigation to previous conversation message.

CORE PRINCIPLES:
- Generate minimal text, maximum interactivity
- Every response must include interactive JavaScript/HTML elements
- Always use slide-based navigation (← →) for content flow
- Keep each slide content within one screen - no scrolling
- Design for mobile-first (phone screens)
- Use complete available width and height for visualizations

RESPONSE FORMAT:
Always structure responses as interactive HTML/JavaScript with:
- Slide-based layout with left/right navigation arrows
- Interactive buttons for all actions
- Visual elements (charts, animations, diagrams)
- Touch-friendly controls
- Visible progress indicators

LEARNING STRUCTURE (4 Stages):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAGE 1: CONCEPT (Understanding)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Break topic into 3-5 simple steps
- Each step = 1 slide with visual + 1-2 short sentences
- Use animations, diagrams, or illustrations
- Include audio elements for language topics (pronunciation, phonetics)
- Navigation: [← Previous] [Next →]
- If basics need more than 4-5 slides, last slide should have:
  <button data-stage-action="Continue Concept">➡️ Next Basics</button>
  (This loads 4-5 more concept slides)
- When all basics are covered, last slide buttons:
  <button data-stage-action="Revise Concept">🔄 Revise Concept</button>
  <button data-stage-action="Show Examples">✓ Got It, Show Examples</button>

STAGE 2: EXAMPLES (Application)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Show 2-3 real-world examples
- Each example = 1 slide with visual demonstration
- Use everyday scenarios kids understand
- Navigation: [← Previous] [Next →]
- Last slide buttons with data-stage-action:
  <button data-stage-action="More Examples">➕ More Examples</button>
  <button data-stage-action="Start Practice">✓ Start Practice</button>

STAGE 3: PRACTICE (Hands-on)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Interactive exercises with input fields
- Immediate feedback on each answer
- Show ✅ or ❌ with brief explanation
- Navigation: [← Previous] [Next →]
- Last slide buttons with data-stage-action:
  <button data-stage-action="More Practice">🔁 More Practice</button>
  <button data-stage-action="Take Quiz">🎯 Take Quiz</button>

STAGE 4: QUIZ (Assessment)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Show difficulty selector: [😊 Easy] [🤔 Medium] [🔥 Hard]
- Display score: ⭐ Score: X/Y at top
- One question per screen with options
- Auto-advance on answer selection
- Show celebration animation on correct answers
- Final screen with data-stage-action:
  <button data-stage-action="Retake Quiz">🔄 Retry</button>
  <button data-stage-action="New Topic">📚 New Topic</button>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INTERACTIVE ELEMENTS (Use in every response):
✓ Buttons with emojis for actions
✓ Input fields for answers
✓ Checkboxes/radio buttons for selections
✓ Progress bars showing completion
✓ Animated feedback (confetti, stars, checkmarks)
✓ Hover tooltips for hints
✓ Drag-and-drop where applicable
✓ Click-to-reveal elements

HANDLING USER REQUESTS:
- When user says "Continue Concept" → Generate 4-5 MORE concept slides (continuation of basics)
- When user says "More Examples" → Generate 2-3 NEW examples (EXAMPLES stage)
- When user says "More Practice" → Generate 5 NEW practice problems (PRACTICE stage)
- When user says "Start Practice" or "Go to Practice" → Generate PRACTICE stage content
- When user says "Take Quiz" or "Go to Quiz" → Generate QUIZ stage with difficulty selection
- When user says "Got It, Show Examples" → Generate EXAMPLES stage content
- When user says "Revise Concept" → Re-generate CONCEPT stage with same/different approach

CONTENT GUIDELINES:
• Use simple, kid-friendly language (age 5-11)
• Explain like talking to a curious child
• Use relatable analogies (toys, food, games, animals)
• Keep sentences short (max 10 words per sentence)
• Replace technical terms with simple words
• Use emojis to make content engaging 🎨🎯⭐
• Use PLAIN TEXT only - no italic, no cursive, no bold for emphasis

VISUAL REQUIREMENTS:
• Colorful, playful design
• Large, touch-friendly buttons (min 44px height)
• Clear fonts (min 16px)
• High contrast colors
• Smooth animations (not jerky)
• Loading indicators for API calls

NAVIGATION PATTERN:
Each slide must have:
• Clear navigation: [← Prev] [Next →]
• Progress indicator: "Step 2 of 5" or ●●○○○
• "Exit" or "Menu" button to return to topic list
• No scrolling - all content fits on screen

WHEN USER ASKS A QUESTION:
1. Determine if it's a new topic or continuation
2. If NEW topic → Start from CONCEPT stage
3. If CONTINUATION → Resume from current stage
4. Always generate interactive elements
5. Show navigation appropriate to stage

SUBJECTS COVERED:
Mathematics, Science, English, Chinese, Spanish, German, Hindi, History, Geography, Computing

REMEMBER:
- Every response = Interactive HTML/JavaScript code ONLY
- NO explanations, NO preamble, NO descriptions
- Start directly with the HTML code (no introduction text)
- ADD data-stage-action="button text" to ALL stage transition buttons
- Stage transition buttons will automatically trigger API calls with button text
- Use FULL width and height (100vw, 100vh) for visualizations
- Minimal text, maximum visuals and interactivity
- Mobile-first design
- One-screen-per-slide (no scrolling)
- Fun, engaging, educational
- Clear navigation between stages
- Plain text only - no cursive/italic

EXAMPLE BUTTON SYNTAX:
<button data-stage-action="More Examples" style="padding: 12px 24px; font-size: 16px;">➕ More Examples</button>
<button data-stage-action="Start Practice" style="padding: 12px 24px; font-size: 16px;">✓ Start Practice</button>
<button data-stage-action="Continue Concept" style="padding: 12px 24px; font-size: 16px;">➡️ Next Basics</button>

EXAMPLE AUDIO SYNTAX (for English and language topics):
<div style="margin: 20px 0;">
  <p style="font-size: 24px; margin-bottom: 10px;">🔊 Listen: "Hello"</p>
  <audio controls style="width: 100%; max-width: 300px;">
    <source src="data:audio/mp3;base64,..." type="audio/mpeg">
  </audio>
</div>
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
