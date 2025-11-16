'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Search, Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  property_id: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  property?: {
    title: string;
    address: string;
  };
  participants: {
    user_id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  }[];
  messages: {
    content: string;
    created_at: string;
  }[];
}

export default function ConversationsList({ userId }: { userId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchConversations();
  }, [userId]);

  const fetchConversations = async () => {
    try {
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (participantError) throw participantError;

      const conversationIds = participantData?.map(p => p.conversation_id) || [];

      if (conversationIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          property:properties(title, address),
          participants:conversation_participants(
            user_id,
            profiles(full_name, avatar_url)
          ),
          messages(content, created_at)
        `)
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const propertyMatch = conv.property?.title?.toLowerCase().includes(query) ||
                          conv.property?.address?.toLowerCase().includes(query);
    const participantMatch = conv.participants?.some(p => 
      p.profiles?.full_name?.toLowerCase().includes(query)
    );
    return propertyMatch || participantMatch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No conversations yet</p>
            <p className="text-sm text-gray-500 mt-1">Start a conversation about a property</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const otherParticipants = conversation.participants?.filter(p => p.user_id !== userId) || [];
            const lastMessage = conversation.messages?.[0];
            
            return (
              <div
                key={conversation.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {otherParticipants[0]?.profiles?.avatar_url ? (
                      <img
                        src={otherParticipants[0].profiles.avatar_url}
                        alt={otherParticipants[0].profiles.full_name || 'User'}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {conversation.property?.title || 'General Discussion'}
                      </h3>
                      {conversation.last_message_at && (
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(conversation.last_message_at), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>

                    {conversation.property?.address && (
                      <p className="text-xs text-gray-500 mb-1">{conversation.property.address}</p>
                    )}

                    <p className="text-sm text-gray-600 mb-1">
                      {otherParticipants.map(p => p.profiles?.full_name).filter(Boolean).join(', ')}
                    </p>

                    {lastMessage && (
                      <p className="text-sm text-gray-500 truncate">
                        {lastMessage.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
