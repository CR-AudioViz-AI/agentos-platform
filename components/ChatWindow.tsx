'use client';

/**
 * ChatWindow Component
 * 
 * Real-time messaging interface for AgentOS platform
 * Features:
 * - Real-time message sending/receiving via Supabase Realtime
 * - Typing indicators
 * - Read receipts
 * - Automatic scroll to bottom
 * - Message timestamps
 * - Loading states
 * - Error handling
 * - Optimistic UI updates
 * 
 * Created: November 17, 2025 - 2:10 AM EST
 * Standard: Henderson Standard - Fortune 50 Quality
 */

import { useEffect, useState, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Message = Database['public']['Tables']['messages']['Row'];
type Conversation = Database['public']['Tables']['conversations']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  otherUserProfile: Profile;
  onClose?: () => void;
}

export default function ChatWindow({
  conversationId,
  currentUserId,
  otherUserProfile,
  onClose
}: ChatWindowProps) {
  const supabase = createClientComponentClient<Database>();
  
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * Load initial messages
   */
  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('deleted', false)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setMessages(data || []);
      
      // Mark messages as read
      await markMessagesAsRead();
      
      // Scroll to bottom after loading
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mark all unread messages as read
   */
  const markMessagesAsRead = async () => {
    try {
      const { error: updateError } = await supabase.rpc('mark_conversation_read', {
        p_conversation_id: conversationId,
        p_user_id: currentUserId
      });

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Error marking messages as read:', err);
      // Non-critical error, don't show to user
    }
  };

  /**
   * Send a new message
   */
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const messageContent = newMessage.trim();
    if (!messageContent || sending) return;

    try {
      setSending(true);
      setError(null);

      // Optimistic UI update
      const optimisticMessage: Message = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: messageContent,
        message_type: 'text',
        read: false,
        read_at: null,
        deleted: false,
        deleted_at: null
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
      scrollToBottom();

      // Send to database
      const { data, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: messageContent,
          message_type: 'text'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Replace optimistic message with real one
      setMessages(prev => 
        prev.map(msg => 
          msg.id === optimisticMessage.id ? data : msg
        )
      );

      // Clear typing indicator
      await clearTypingIndicator();
      
      // Focus input
      inputRef.current?.focus();
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      
      // Remove optimistic message on error
      setMessages(prev => prev.slice(0, -1));
      setNewMessage(messageContent); // Restore message text
    } finally {
      setSending(false);
    }
  };

  /**
   * Handle typing indicator
   */
  const handleTyping = async () => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update typing indicator in database
    try {
      await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: currentUserId,
          expires_at: new Date(Date.now() + 5000).toISOString()
        });
    } catch (err) {
      console.error('Error updating typing indicator:', err);
      // Non-critical error, don't show to user
    }

    // Set timeout to clear indicator
    typingTimeoutRef.current = setTimeout(() => {
      clearTypingIndicator();
    }, 5000);
  };

  /**
   * Clear typing indicator
   */
  const clearTypingIndicator = async () => {
    try {
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', currentUserId);
    } catch (err) {
      console.error('Error clearing typing indicator:', err);
      // Non-critical error, don't show to user
    }
  };

  /**
   * Subscribe to real-time messages
   */
  useEffect(() => {
    loadMessages();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          
          // Don't add if it's our own message (already added optimistically)
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMsg.id);
            if (exists) return prev;
            
            // Mark as read if we're receiving it
            if (newMsg.sender_id !== currentUserId) {
              markMessagesAsRead();
            }
            
            return [...prev, newMsg];
          });
          
          scrollToBottom();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages(prev => 
            prev.map(msg => msg.id === updatedMsg.id ? updatedMsg : msg)
          );
        }
      )
      .subscribe();

    // Subscribe to typing indicators
    const typingChannel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const indicator = payload.new as any;
            setIsTyping(indicator.user_id !== currentUserId);
          } else if (payload.eventType === 'DELETE') {
            setIsTyping(false);
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(typingChannel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      clearTypingIndicator();
    };
  }, [conversationId]);

  /**
   * Auto-scroll on new messages
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Format message timestamp
   */
  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="relative">
            {otherUserProfile.avatar_url ? (
              <img
                src={otherUserProfile.avatar_url}
                alt={otherUserProfile.full_name || 'User'}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                {(otherUserProfile.full_name || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {otherUserProfile.full_name || 'User'}
            </h3>
            <p className="text-sm text-gray-500 capitalize">
              {otherUserProfile.role}
            </p>
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
              <p className="text-red-600 font-medium">{error}</p>
              <button
                onClick={loadMessages}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_id === currentUserId;
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isOwnMessage
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <div
                    className={`flex items-center justify-end space-x-2 mt-1 text-xs ${
                      isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    <span>{formatTimestamp(message.created_at)}</span>
                    {isOwnMessage && message.read && (
                      <span className="text-blue-100">✓✓</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
        {error && (
          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        
        <div className="flex items-end space-x-2">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={sending}
          />
          
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
        
        <p className="mt-2 text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
