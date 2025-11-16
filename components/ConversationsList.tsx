'use client';

/**
 * ConversationsList Component
 * 
 * Displays list of conversations with real-time updates
 * Features:
 * - Real-time conversation updates
 * - Unread message badges
 * - Last message preview
 * - User avatars
 * - Search/filter
 * - Empty states
 * - Loading states
 * - Error handling
 * 
 * Created: November 17, 2025 - 2:15 AM EST
 * Standard: Henderson Standard - Fortune 50 Quality
 */

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import { Search, Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface ConversationWithProfile extends Conversation {
  other_user_profile: Profile;
  unread_count: number;
}

interface ConversationsListProps {
  currentUserId: string;
  onSelectConversation: (conversation: ConversationWithProfile) => void;
  selectedConversationId?: string;
}

export default function ConversationsList({
  currentUserId,
  onSelectConversation,
  selectedConversationId
}: ConversationsListProps) {
  const supabase = createClientComponentClient<Database>();
  
  // State management
  const [conversations, setConversations] = useState<ConversationWithProfile[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<ConversationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Load all conversations for current user
   */
  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch conversations
      const { data: conversationsData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        setFilteredConversations([]);
        return;
      }

      // Get all other user IDs
      const otherUserIds = conversationsData.map(conv => 
        conv.user1_id === currentUserId ? conv.user2_id : conv.user1_id
      );

      // Fetch profiles for other users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', otherUserIds);

      if (profilesError) throw profilesError;

      // Create profile map for quick lookup
      const profileMap = new Map<string, Profile>();
      profilesData?.forEach(profile => {
        profileMap.set(profile.id, profile);
      });

      // Fetch unread counts for each conversation
      const conversationsWithProfiles: ConversationWithProfile[] = await Promise.all(
        conversationsData.map(async (conv) => {
          const otherUserId = conv.user1_id === currentUserId ? conv.user2_id : conv.user1_id;
          const otherUserProfile = profileMap.get(otherUserId) || {
            id: otherUserId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            email: '',
            full_name: 'Unknown User',
            avatar_url: null,
            role: 'buyer',
            phone: null,
            bio: null,
            license_number: null,
            brokerage: null,
            years_experience: null,
            specialties: null,
            service_areas: null,
            languages: null,
            average_rating: null,
            total_reviews: null,
            total_sales: null,
            status: 'pending'
          };

          // Get unread count
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('read', false)
            .neq('sender_id', currentUserId);

          return {
            ...conv,
            other_user_profile: otherUserProfile,
            unread_count: count || 0
          };
        })
      );

      setConversations(conversationsWithProfiles);
      setFilteredConversations(conversationsWithProfiles);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filter conversations based on search query
   */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = conversations.filter(conv => {
      const name = conv.other_user_profile.full_name?.toLowerCase() || '';
      const email = conv.other_user_profile.email?.toLowerCase() || '';
      const preview = conv.last_message_preview?.toLowerCase() || '';
      
      return name.includes(query) || email.includes(query) || preview.includes(query);
    });

    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  /**
   * Subscribe to real-time conversation updates
   */
  useEffect(() => {
    loadConversations();

    // Subscribe to conversation updates
    const conversationsChannel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `user1_id=eq.${currentUserId}`
        },
        () => {
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `user2_id=eq.${currentUserId}`
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    // Subscribe to message updates (for unread counts)
    const messagesChannel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [currentUserId]);

  /**
   * Format timestamp
   */
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '';
    
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  /**
   * Get total unread count
   */
  const totalUnreadCount = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
          {totalUnreadCount > 0 && (
            <span className="px-2 py-1 text-xs font-semibold text-white bg-blue-500 rounded-full">
              {totalUnreadCount} unread
            </span>
          )}
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <button
              onClick={loadConversations}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-gray-500">
            <MessageSquare className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-center font-medium">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            <p className="text-center text-sm mt-2">
              {searchQuery ? 'Try a different search term' : 'Start a conversation to get started'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation)}
                className={`w-full p-4 hover:bg-gray-50 transition-colors text-left ${
                  selectedConversationId === conversation.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {conversation.other_user_profile.avatar_url ? (
                      <img
                        src={conversation.other_user_profile.avatar_url}
                        alt={conversation.other_user_profile.full_name || 'User'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-lg">
                        {(conversation.other_user_profile.full_name || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    
                    {/* Unread Badge */}
                    {conversation.unread_count > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                        {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                      </div>
                    )}
                  </div>

                  {/* Conversation Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className={`font-semibold truncate ${
                        conversation.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {conversation.other_user_profile.full_name || 'Unknown User'}
                      </h3>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {formatTimestamp(conversation.last_message_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-500 capitalize mb-1">
                      {conversation.other_user_profile.role}
                    </p>
                    
                    {conversation.last_message_preview && (
                      <p className={`text-sm truncate ${
                        conversation.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'
                      }`}>
                        {conversation.last_message_preview}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
