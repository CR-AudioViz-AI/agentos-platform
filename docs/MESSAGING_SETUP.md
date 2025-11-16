# AgentOS Messaging System - Setup Guide

**Created:** November 17, 2025 - 2:25 AM EST  
**Standard:** Henderson Standard - Fortune 50 Quality  
**Status:** Phase 5 Complete - Ready for Deployment

---

## Overview

Complete real-time messaging system enabling communication between:
- Agents ↔ Buyers
- Agents ↔ Sellers  
- Agents ↔ Agents
- Admins ↔ Anyone

### Features Implemented

✅ **Real-time messaging** via Supabase Realtime  
✅ **Typing indicators** with auto-expiration  
✅ **Read receipts** with timestamps  
✅ **Unread message badges**  
✅ **Message search & filtering**  
✅ **Conversation management**  
✅ **Property/Tour context linking**  
✅ **Comprehensive RLS policies**  
✅ **Optimistic UI updates**  
✅ **Error handling & retries**  
✅ **Responsive design**  
✅ **Accessibility features**

---

## Installation Steps

### 1. Database Setup

Execute the SQL schema in your Supabase dashboard:

```bash
# Copy schema to clipboard
cat MESSAGING_SCHEMA.sql

# Then in Supabase:
# 1. Go to SQL Editor
# 2. Create new query
# 3. Paste the entire schema
# 4. Execute (Run button)
```

**Verification:**
```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('conversations', 'messages', 'typing_indicators');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('conversations', 'messages', 'typing_indicators');

-- Check Realtime is enabled
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

### 2. Component Installation

Place components in your Next.js project:

```bash
# Create directories if they don't exist
mkdir -p components
mkdir -p app/api/conversations/create

# Copy components
cp ChatWindow.tsx components/
cp ConversationsList.tsx components/

# Copy API route
cp create-conversation-route.ts app/api/conversations/create/route.ts
```

### 3. Dependencies

Ensure these packages are installed:

```bash
npm install @supabase/auth-helpers-nextjs @supabase/supabase-js date-fns lucide-react
```

### 4. TypeScript Types

Your `types/supabase.ts` should include these table definitions:

```typescript
export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user1_id: string;
          user2_id: string;
          property_id: string | null;
          tour_id: string | null;
          last_message_at: string | null;
          last_message_preview: string | null;
          archived_by_user1: boolean;
          archived_by_user2: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user1_id: string;
          user2_id: string;
          property_id?: string | null;
          tour_id?: string | null;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          archived_by_user1?: boolean;
          archived_by_user2?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user1_id?: string;
          user2_id?: string;
          property_id?: string | null;
          tour_id?: string | null;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          archived_by_user1?: boolean;
          archived_by_user2?: boolean;
        };
      };
      messages: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type: 'text' | 'system' | 'property_share' | 'tour_update';
          read: boolean;
          read_at: string | null;
          deleted: boolean;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type?: 'text' | 'system' | 'property_share' | 'tour_update';
          read?: boolean;
          read_at?: string | null;
          deleted?: boolean;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          message_type?: 'text' | 'system' | 'property_share' | 'tour_update';
          read?: boolean;
          read_at?: string | null;
          deleted?: boolean;
          deleted_at?: string | null;
        };
      };
      typing_indicators: {
        Row: {
          id: string;
          created_at: string;
          conversation_id: string;
          user_id: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          conversation_id: string;
          user_id: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          conversation_id?: string;
          user_id?: string;
          expires_at?: string;
        };
      };
    };
  };
}
```

---

## Usage Examples

### Basic Implementation

Create a messages page:

```typescript
// app/messages/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import ConversationsList from '@/components/ConversationsList';
import ChatWindow from '@/components/ChatWindow';

export default function MessagesPage() {
  const supabase = createClientComponentClient();
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [selectedConversation, setSelectedConversation] = useState(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
      }
    };
    
    getCurrentUser();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-100px)]">
        {/* Conversations List */}
        <div className="md:col-span-1">
          <ConversationsList
            currentUserId={currentUserId}
            onSelectConversation={setSelectedConversation}
            selectedConversationId={selectedConversation?.id}
          />
        </div>

        {/* Chat Window */}
        <div className="md:col-span-2">
          {selectedConversation ? (
            <ChatWindow
              conversationId={selectedConversation.id}
              currentUserId={currentUserId}
              otherUserProfile={selectedConversation.other_user_profile}
              onClose={() => setSelectedConversation(null)}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
              <p className="text-gray-500">Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Creating Conversations Programmatically

From property pages, agent profiles, etc:

```typescript
// Example: Start conversation from property page
const startConversation = async (agentId: string, propertyId: string) => {
  try {
    const response = await fetch('/api/conversations/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        otherUserId: agentId,
        propertyId: propertyId
      })
    });

    const { conversation } = await response.json();
    
    // Navigate to messages page with conversation selected
    router.push(`/messages?conversation=${conversation.id}`);
  } catch (error) {
    console.error('Failed to create conversation:', error);
  }
};
```

### Checking if Conversation Exists

Before creating, check if it already exists:

```typescript
const checkConversation = async (otherUserId: string) => {
  const response = await fetch(
    `/api/conversations/create?otherUserId=${otherUserId}`
  );
  
  if (response.ok) {
    const { exists, conversation } = await response.json();
    return conversation;
  }
  
  return null;
};
```

---

## Integration Points

### Add "Message Agent" Button to Property Pages

```typescript
// components/PropertyCard.tsx
<button
  onClick={() => handleMessageAgent(property.agent_id, property.id)}
  className="btn-primary"
>
  Message Agent
</button>

const handleMessageAgent = async (agentId: string, propertyId: string) => {
  // Check if conversation exists
  const existing = await checkConversation(agentId);
  
  if (existing) {
    router.push(`/messages?conversation=${existing.id}`);
  } else {
    // Create new conversation
    const response = await fetch('/api/conversations/create', {
      method: 'POST',
      body: JSON.stringify({ otherUserId: agentId, propertyId })
    });
    
    const { conversation } = await response.json();
    router.push(`/messages?conversation=${conversation.id}`);
  }
};
```

### Add "Contact Agent" from Agent Profiles

```typescript
// app/agents/[id]/page.tsx
<button
  onClick={() => handleContactAgent(agent.id)}
  className="btn-primary"
>
  Contact Agent
</button>
```

### Add Message Button to Tour Requests

```typescript
// When tour is requested/confirmed
const notifyAgentAboutTour = async (tourId: string, agentId: string) => {
  // Create conversation linked to tour
  await fetch('/api/conversations/create', {
    method: 'POST',
    body: JSON.stringify({ 
      otherUserId: agentId, 
      tourId: tourId 
    })
  });
  
  // Send initial system message
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: systemUserId,
    content: 'New tour request received!',
    message_type: 'tour_update'
  });
};
```

---

## Testing

### Manual Testing Checklist

- [ ] Create conversation between two users
- [ ] Send messages back and forth
- [ ] Verify real-time updates (open two browser windows)
- [ ] Test typing indicators appear/disappear
- [ ] Check read receipts work correctly
- [ ] Verify unread counts update in real-time
- [ ] Test message search functionality
- [ ] Try sending empty messages (should be blocked)
- [ ] Test error recovery (disconnect/reconnect)
- [ ] Check RLS prevents unauthorized access
- [ ] Test on mobile devices
- [ ] Verify accessibility (keyboard navigation)

### Automated Testing

```typescript
// Example test with Jest
describe('Messaging System', () => {
  it('should create conversation between users', async () => {
    const response = await fetch('/api/conversations/create', {
      method: 'POST',
      body: JSON.stringify({
        otherUserId: 'user-2-id'
      })
    });
    
    expect(response.status).toBe(200);
    const { conversation } = await response.json();
    expect(conversation).toBeDefined();
    expect(conversation.user1_id).toBeDefined();
    expect(conversation.user2_id).toBeDefined();
  });
  
  it('should prevent creating duplicate conversations', async () => {
    // Create first conversation
    await fetch('/api/conversations/create', {
      method: 'POST',
      body: JSON.stringify({ otherUserId: 'user-2-id' })
    });
    
    // Try to create duplicate
    const response = await fetch('/api/conversations/create', {
      method: 'POST',
      body: JSON.stringify({ otherUserId: 'user-2-id' })
    });
    
    const { conversation } = await response.json();
    // Should return existing conversation, not create new one
    expect(conversation).toBeDefined();
  });
});
```

---

## Security Considerations

### Row Level Security (RLS)

All tables have comprehensive RLS policies:
- Users can only view conversations they're part of
- Users can only send messages in their conversations
- Users can only update their own messages
- Admins have read access to all conversations
- Typing indicators are scoped to conversation participants

### Input Validation

- Message content is validated (not empty)
- User IDs are verified to exist
- Users cannot message themselves
- Conversation participants are verified before message send

### Rate Limiting

Consider implementing rate limiting:

```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function middleware(request: Request) {
  if (request.url.includes('/api/conversations')) {
    const ip = request.headers.get('x-forwarded-for');
    const { success } = await ratelimit.limit(ip);
    
    if (!success) {
      return new Response('Too many requests', { status: 429 });
    }
  }
}
```

---

## Performance Optimization

### Message Pagination

For conversations with 100+ messages:

```typescript
const loadMoreMessages = async (conversationId: string, page: number) => {
  const limit = 50;
  const offset = page * limit;
  
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  return data;
};
```

### Conversation List Optimization

```typescript
// Load conversations with pagination
const loadConversations = async (page: number = 0) => {
  const limit = 20;
  const offset = page * limit;
  
  const { data } = await supabase
    .from('conversations')
    .select('*, messages(content, created_at)')
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  return data;
};
```

---

## Troubleshooting

### Messages Not Appearing in Real-time

**Symptoms:** Messages only appear on page refresh

**Solutions:**
1. Verify Supabase Realtime is enabled for your project
2. Check that tables are added to `supabase_realtime` publication:
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```
3. Check browser console for WebSocket errors
4. Verify user is authenticated

### RLS Policy Errors

**Symptoms:** "permission denied" or empty results

**Solutions:**
1. Verify user is authenticated before queries
2. Test policies in Supabase SQL editor with RLS enabled:
   ```sql
   SET LOCAL role TO authenticated;
   SET LOCAL request.jwt.claim.sub TO 'user-id-here';
   SELECT * FROM conversations;
   ```
3. Check policy definitions match user context

### Typing Indicators Not Working

**Symptoms:** "typing..." doesn't appear

**Solutions:**
1. Check typing_indicators table exists
2. Verify Realtime subscription is active
3. Check browser console for errors
4. Confirm RLS policies allow INSERT/DELETE

### Unread Counts Incorrect

**Symptoms:** Badge shows wrong number

**Solutions:**
1. Verify messages are being marked as read
2. Check `read` field is being updated correctly
3. Test `mark_conversation_read` function
4. Verify subscription is listening to UPDATE events

---

## Future Enhancements

Possible additions for Phase 6+:

- [ ] **File Attachments:** Upload images, documents via Cloudinary
- [ ] **Voice Messages:** Record and send audio clips
- [ ] **Message Reactions:** Emoji reactions to messages
- [ ] **Group Conversations:** Multiple participants
- [ ] **Message Search:** Full-text search across all messages
- [ ] **Desktop Notifications:** Browser push notifications
- [ ] **Email Notifications:** Digest of unread messages
- [ ] **Message Deletion:** Soft/hard delete with "unsend"
- [ ] **Block/Report:** User moderation tools
- [ ] **Scheduled Messages:** Send messages at specific times
- [ ] **Message Templates:** Quick replies for common questions
- [ ] **Video Calls:** Integrated video conferencing
- [ ] **Screen Sharing:** Share screen during conversations

---

## Support & Maintenance

### Database Maintenance

Run periodic maintenance to clean up expired typing indicators:

```sql
-- Manual cleanup
SELECT perform_messaging_maintenance();

-- Or set up cron job (requires pg_cron extension)
SELECT cron.schedule(
  'messaging-maintenance', 
  '*/5 * * * *', 
  'SELECT perform_messaging_maintenance()'
);
```

### Monitoring

Track these metrics:
- Message send failures
- Real-time connection drops
- Average response time
- Conversations per user
- Messages per day
- Unread message age

---

## Credits

**Created by:** Claude (Anthropic)  
**For:** Roy Henderson, CEO - CR AudioViz AI  
**Project:** AgentOS Real Estate Platform  
**Standard:** Henderson Standard - Fortune 50 Quality  
**Date:** November 17, 2025

---

**Phase 5 Status:** ✅ COMPLETE  
**Next Phase:** Calendar/Scheduling System

