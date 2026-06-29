export interface Attachment {
  type: 'image' | 'document' | 'spreadsheet' | 'text' | 'csv';
  url: string;
  file?: File;
  fileName?: string;
  extractedContent?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  isFavorite: boolean;
}

const STORAGE_KEY = 'conversations';
const CURRENT_CONVERSATION_KEY = 'currentConversationId';

/**
 * Generate a unique conversation ID
 */
export function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a title from the first user message
 */
export function generateTitle(messages: Message[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage) return 'New Conversation';

  const content = firstUserMessage.content.trim();
  // Limit to 50 characters
  if (content.length <= 50) return content;
  return content.substring(0, 47) + '...';
}

/**
 * Get all conversations from localStorage
 */
export function getAllConversations(): Conversation[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const conversations = JSON.parse(data) as Conversation[];
    // Convert date strings back to Date objects
    return conversations.map(conv => ({
      ...conv,
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
      messages: conv.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    }));
  } catch (error) {
    console.error('Error loading conversations:', error);
    return [];
  }
}

/**
 * Save all conversations to localStorage
 */
function saveAllConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (error) {
    console.error('Error saving conversations:', error);
  }
}

/**
 * Get a specific conversation by ID
 */
export function getConversation(id: string): Conversation | null {
  const conversations = getAllConversations();
  return conversations.find(c => c.id === id) || null;
}

/**
 * Create a new conversation
 */
export function createConversation(): Conversation {
  const newConversation: Conversation = {
    id: generateConversationId(),
    title: 'New Conversation',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isFavorite: false
  };

  const conversations = getAllConversations();
  conversations.unshift(newConversation); // Add to beginning
  saveAllConversations(conversations);
  setCurrentConversationId(newConversation.id);

  return newConversation;
}

/**
 * Update a conversation
 */
export function updateConversation(id: string, updates: Partial<Conversation>): void {
  const conversations = getAllConversations();
  const index = conversations.findIndex(c => c.id === id);

  if (index !== -1) {
    conversations[index] = {
      ...conversations[index],
      ...updates,
      updatedAt: new Date()
    };

    // Auto-generate title if messages were updated and title is still default
    if (updates.messages && conversations[index].title === 'New Conversation') {
      conversations[index].title = generateTitle(updates.messages);
    }

    saveAllConversations(conversations);
  }
}

/**
 * Delete a conversation
 */
export function deleteConversation(id: string): void {
  const conversations = getAllConversations();
  const filtered = conversations.filter(c => c.id !== id);
  saveAllConversations(filtered);

  // If deleting current conversation, clear current ID
  if (getCurrentConversationId() === id) {
    localStorage.removeItem(CURRENT_CONVERSATION_KEY);
  }
}

/**
 * Toggle favorite status
 */
export function toggleFavorite(id: string): void {
  const conversations = getAllConversations();
  const index = conversations.findIndex(c => c.id === id);

  if (index !== -1) {
    conversations[index].isFavorite = !conversations[index].isFavorite;
    conversations[index].updatedAt = new Date();
    saveAllConversations(conversations);
  }
}

/**
 * Get current conversation ID
 */
export function getCurrentConversationId(): string | null {
  return localStorage.getItem(CURRENT_CONVERSATION_KEY);
}

/**
 * Set current conversation ID
 */
export function setCurrentConversationId(id: string): void {
  localStorage.setItem(CURRENT_CONVERSATION_KEY, id);
}

/**
 * Delete all conversations
 */
export function clearAllConversations(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CURRENT_CONVERSATION_KEY);
}

/**
 * Get sorted conversations (favorites first, then by updated date)
 */
export function getSortedConversations(): Conversation[] {
  const conversations = getAllConversations();
  return conversations.sort((a, b) => {
    // Favorites first
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;

    // Then by updated date (newest first)
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}
