import { useState, useEffect } from 'react';
import { MessageSquare, Trash2, Star, ChevronDown, Plus } from 'lucide-react';
import {
  getSortedConversations,
  toggleFavorite,
  deleteConversation,
  getCurrentConversationId,
  type Conversation
} from '../services/conversationStorage';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface ConversationListProps {
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  currentConversationId?: string | null;
}

export default function ConversationList({
  onSelectConversation,
  onNewConversation,
  currentConversationId
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);

  // Load conversations
  const loadConversations = () => {
    const sorted = getSortedConversations();
    setConversations(sorted);
  };

  useEffect(() => {
    loadConversations();
  }, [currentConversationId]);

  const handleToggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleFavorite(id);
    loadConversations();
  };

  const handleDeleteClick = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation();
    setConversationToDelete(conversation);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      deleteConversation(conversationToDelete.id);
      loadConversations();

      // If deleting current conversation, create a new one
      if (conversationToDelete.id === currentConversationId) {
        onNewConversation();
      }
    }
    setDeleteModalOpen(false);
    setConversationToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setConversationToDelete(null);
  };

  const handleSelectConversation = (id: string) => {
    onSelectConversation(id);
    setIsOpen(false);
  };

  const currentConv = conversations.find(c => c.id === currentConversationId);

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MessageSquare size={18} className="text-slate-600 flex-shrink-0" />
            <span className="text-sm font-medium text-slate-700 truncate">
              {currentConv?.title || 'New Conversation'}
            </span>
          </div>
          <ChevronDown
            size={18}
            className={`text-slate-600 transition-transform flex-shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-2xl z-20 max-h-[400px] overflow-y-auto">
              {/* New Conversation Button */}
              <button
                onClick={() => {
                  onNewConversation();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-200"
              >
                <Plus size={18} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-600">
                  New Conversation
                </span>
              </button>

              {/* Conversation List */}
              {conversations.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500 text-sm">
                  No conversations yet
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation.id)}
                    onMouseEnter={() => setHoveredId(conversation.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`relative px-4 py-3 cursor-pointer transition-colors border-b border-slate-100 last:border-0 ${
                      conversation.id === currentConversationId
                        ? 'bg-blue-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare
                        size={16}
                        className="text-slate-400 flex-shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {conversation.isFavorite && (
                            <Star
                              size={14}
                              className="text-yellow-500 fill-yellow-500 flex-shrink-0"
                            />
                          )}
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {conversation.title}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {conversation.messages.length} messages •{' '}
                          {new Date(conversation.updatedAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Action Buttons (shown on hover) */}
                      {hoveredId === conversation.id && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => handleToggleFavorite(e, conversation.id)}
                            className="p-1.5 rounded hover:bg-white transition-colors"
                            title={
                              conversation.isFavorite
                                ? 'Remove from favorites'
                                : 'Add to favorites'
                            }
                          >
                            <Star
                              size={16}
                              className={`${
                                conversation.isFavorite
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-slate-400'
                              }`}
                            />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(e, conversation)}
                            className="p-1.5 rounded hover:bg-white transition-colors"
                            title="Delete conversation"
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        conversationTitle={conversationToDelete?.title || ''}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}
