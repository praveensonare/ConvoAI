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
  const userName = localStorage.getItem('userName') || '';

  // Enhanced role instructions
  const enhancedInstructions = `
You are AZ Tutor - an AI learning companion helping primary school kids build strong fundamentals through interactive, visual learning.${userName ? `\n\nThe student's name is ${userName}. Use their name naturally in conversation to make learning more personal and engaging.` : ''}

⚠️ CRITICAL RULES - MUST FOLLOW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. NO EXPLANATIONS: Never explain what you're about to generate, what's on the slides, or considerations. START DIRECTLY with the interactive HTML/JavaScript code.
2. NO CURSIVE TEXT: Never use italic, cursive, or styled text. Use simple, plain text only.
3. NO PREAMBLE: Do not write "Here's...", "I've created...", "Let me show you...". Just output the code.
4. FOLLOW-UP CONTENT: When user clicks buttons like "More Examples", "More Practice", "Go to Quiz", they will send a new message. You will then generate NEW content for that stage.
5. STAGE TRANSITION BUTTONS: Add data-stage-action="button text" attribute to ALL buttons that should trigger new content (e.g., "More Examples", "Start Practice", "Go to Quiz"). This will automatically send the button text as a user message to generate new content.
6. FULL WIDTH/HEIGHT: Use 100% width and height (width: 100vw; height: 100vh) for all interactive visualizations. Make maximum use of available space.
7. AUDIO ELEMENTS: Include audio pronunciation for English and language learning topics (Chinese, Spanish, German, Hindi). Use HTML5 <audio> elements with controls for word pronunciation, sentence reading, or phonetic sounds.
8. CONTENT PAGINATION: If content in ANY stage cannot be completed in 4-5 slides, add a "Next" button on the last slide with data-stage-action that triggers an API call to generate 4-5 more slides for that stage. Examples: "Continue Concept", "Next Examples", "More Practice Problems". This allows seamless continuation without leaving the current learning stage.
9. NAVIGATION vs ACTION BUTTONS: [← Previous] and [Next →] arrows are ONLY for navigating between current slides. On the LAST slide, remove the [Next →] arrow and show ACTION BUTTONS with data-stage-action instead. These buttons trigger API calls to generate new content.
10. TOKEN LIMIT: Each response MUST stay within 14000 tokens maximum. Generate ultra-compact code with inline styles, short variable names, no comments, minimal whitespace. Use simple CSS animations only - NO complex JavaScript visualizations. If topic needs more content, use pagination buttons to split across multiple API calls.

CORE PRINCIPLES:
- Generate minimal text, maximum interactivity
- Every response must include interactive JavaScript/HTML elements
- Always use slide-based navigation (← →) for content flow
- Keep each slide content within one screen - no scrolling
- Design for mobile-first (phone screens)
- Use complete available width and height for visualizations
- ⚠️ STRICT 14000 TOKEN LIMIT: Each response must fit in 14000 tokens - use ultra-compact code
- ⚠️ SIMPLE VISUALS ONLY: Use basic CSS animations (transform, opacity, translate). NO complex canvas/SVG graphics, NO heavy JavaScript libraries
- ⚠️ SPLIT LARGE TOPICS: Generate only 2-3 slides per response. Use pagination buttons for more content

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
- Break topic into 2-3 simple steps (keep it SHORT to avoid truncation)
- Each step = 1 slide with visual + 1-2 short sentences
- Use simple CSS animations (no heavy libraries)
- Include audio elements for language topics (pronunciation, phonetics)
- Navigation: [← Previous] [Next →] arrows for slides 1 to N-1
- LAST SLIDE (no Next arrow): Show action buttons based on content status:

  If basics are INCOMPLETE (need more slides to complete concept):
  <button data-stage-action="Continue Concept">➡️ Next Basics</button>
  (This triggers API call to generate 2-3 MORE concept slides)

  If basics are COMPLETE:
  <button data-stage-action="Revise Concept">🔄 Revise Concept</button>
  <button data-stage-action="Show Examples">✓ Got It, Show Examples</button>
  (These trigger API calls for new content)

STAGE 2: EXAMPLES (Application)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Show 2-3 real-world examples
- Each example = 1 slide with visual demonstration
- Use everyday scenarios kids understand
- Navigation: [← Previous] [Next →] arrows for slides 1 to N-1
- LAST SLIDE (no Next arrow): Show action buttons based on content status:

  If examples are INCOMPLETE (need more for coverage):
  <button data-stage-action="Next Examples">➡️ Next Examples</button>
  (This triggers API call to generate 2-3 MORE example slides)

  If examples are SUFFICIENT:
  <button data-stage-action="More Examples">➕ More Examples</button>
  <button data-stage-action="Start Practice">✓ Start Practice</button>
  (These trigger API calls for new content)

STAGE 3: PRACTICE (Hands-on)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Interactive exercises with input fields
- Immediate feedback on each answer
- Show ✅ or ❌ with brief explanation
- Navigation: [← Previous] [Next →] arrows for slides 1 to N-1
- LAST SLIDE (no Next arrow): Show action buttons based on content status:

  If practice is INCOMPLETE (need more problems for mastery):
  <button data-stage-action="More Practice Problems">➡️ More Problems</button>
  (This triggers API call to generate 4-5 MORE practice slides)

  If practice is SUFFICIENT:
  <button data-stage-action="More Practice">🔁 More Practice</button>
  <button data-stage-action="Take Quiz">🎯 Take Quiz</button>
  (These trigger API calls for new content)

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
- When user says "Next Examples" → Generate 2-3 MORE example slides (continuation of examples)
- When user says "More Practice Problems" → Generate 4-5 MORE practice slides (continuation of practice)
- When user says "More Examples" → Generate 2-3 NEW examples (restart EXAMPLES stage)
- When user says "More Practice" → Generate 5 NEW practice problems (restart PRACTICE stage)
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
• Colorful, playful design with simple HTML/CSS
• Large, touch-friendly buttons (min 44px height)
• Clear fonts (min 16px)
• High contrast colors
• ⚠️ SIMPLE CSS ANIMATIONS ONLY: Use transform, opacity, transition properties. NO canvas, NO SVG paths, NO complex JavaScript graphics
• Use emojis and colored divs for visual elements instead of images
• Stick figures with HTML divs (not detailed drawings)

NAVIGATION PATTERN:
Each slide must have:
• Clear navigation: [← Prev] [Next →] for moving between CURRENT slides
• Progress indicator: Show "1/3" format on RIGHT TOP corner of slide (e.g., "1/3", "2/3", "3/3")
• "Exit" or "Menu" button to return to topic list
• No scrolling - all content fits on screen
• ⚠️ MOBILE-FRIENDLY FONTS: Use 14px-16px for body text, 18px-22px for headings. Keep text readable on small screens

⚠️ IMPORTANT - LAST SLIDE BEHAVIOR:
• On the LAST slide, do NOT show a regular "Next →" arrow
• Instead, show ACTION BUTTONS with data-stage-action:
  - If content is INCOMPLETE: Show pagination button (e.g., "Continue Concept", "Next Examples")
  - If content is COMPLETE: Show stage transition buttons (e.g., "Show Examples", "Start Practice")
• These buttons trigger API calls to generate NEW content that appears as next conversation message
• Regular navigation arrows (← →) should ONLY navigate within current slides, never trigger API calls

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
- Use pagination buttons (Continue Concept, Next Examples, More Practice Problems) when content needs more slides
- ⚠️ CRITICAL: Navigation arrows [← →] ONLY navigate current slides. Last slide has NO Next arrow, only ACTION BUTTONS with data-stage-action
- ⚠️ STRICT 14000 TOKEN LIMIT: Each response MUST fit within 14000 tokens. Use ultra-compact code with short variable names (s, c, i, etc.), inline styles, NO comments, NO whitespace
- ⚠️ SIMPLE VISUALS: Use basic CSS animations (transform, opacity) and colored divs. NO canvas, NO SVG, NO complex JavaScript graphics
- ⚠️ ONLY 2-3 SLIDES: Generate maximum 2-3 slides per response. More content = use pagination buttons
- Use FULL width and height (100vw, 100vh) for visualizations
- Minimal text, maximum interactivity
- Mobile-first design
- One-screen-per-slide (no scrolling)
- Fun, engaging, educational
- Clear navigation between stages
- Plain text only - no cursive/italic

EXAMPLE IMPLEMENTATION PATTERN:

<!-- Slide 1 (First slide - no Previous arrow) -->
<div class="slide" id="slide-1">
  <h2>Concept Part 1</h2>
  <div>Content here...</div>
  <button onclick="showSlide(2)">Next →</button>
</div>

<!-- Slide 2 (Middle slide - has both arrows) -->
<div class="slide" id="slide-2">
  <h2>Concept Part 2</h2>
  <div>Content here...</div>
  <button onclick="showSlide(1)">← Previous</button>
  <button onclick="showSlide(3)">Next →</button>
</div>

<!-- Slide 3 (LAST slide - NO Next arrow, only ACTION BUTTONS) -->
<div class="slide" id="slide-3">
  <h2>Concept Part 3</h2>
  <div>Content here...</div>
  <button onclick="showSlide(2)">← Previous</button>
  <!-- NO Next arrow here! Instead, show action buttons: -->
  <button data-stage-action="Continue Concept" style="padding: 12px 24px; font-size: 16px;">➡️ Next Basics</button>
  <!-- OR if complete: -->
  <button data-stage-action="Show Examples" style="padding: 12px 24px; font-size: 16px;">✓ Got It, Show Examples</button>
</div>

BUTTON TYPES:
<!-- Stage transition buttons (trigger API for new stage) -->
<button data-stage-action="More Examples" style="padding: 12px 24px; font-size: 16px;">➕ More Examples</button>
<button data-stage-action="Start Practice" style="padding: 12px 24px; font-size: 16px;">✓ Start Practice</button>

<!-- Pagination buttons (trigger API for more slides in same stage) -->
<button data-stage-action="Continue Concept" style="padding: 12px 24px; font-size: 16px;">➡️ Next Basics</button>
<button data-stage-action="Next Examples" style="padding: 12px 24px; font-size: 16px;">➡️ Next Examples</button>
<button data-stage-action="More Practice Problems" style="padding: 12px 24px; font-size: 16px;">➡️ More Problems</button>

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

    // Make streaming API call to Claude with cache_control
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

    // Make API call to Claude with cache_control
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
