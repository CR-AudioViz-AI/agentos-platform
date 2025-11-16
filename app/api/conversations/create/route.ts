/**
 * Create Conversation API Route
 * 
 * Endpoint: POST /api/conversations/create
 * 
 * Creates or retrieves a conversation between two users
 * Uses database function get_or_create_conversation for atomic operations
 * 
 * Created: November 17, 2025 - 2:20 AM EST
 * Standard: Henderson Standard - Fortune 50 Quality
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { otherUserId, propertyId, tourId } = body;

    // Validate required fields
    if (!otherUserId) {
      return NextResponse.json(
        { error: 'otherUserId is required' },
        { status: 400 }
      );
    }

    // Prevent creating conversation with self
    if (otherUserId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot create conversation with yourself' },
        { status: 400 }
      );
    }

    // Verify other user exists
    const { data: otherUser, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', otherUserId)
      .single();

    if (userError || !otherUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get or create conversation using database function
    const { data: conversationId, error: convError } = await supabase
      .rpc('get_or_create_conversation', {
        p_user1_id: session.user.id,
        p_user2_id: otherUserId,
        p_property_id: propertyId || null,
        p_tour_id: tourId || null
      });

    if (convError) {
      console.error('Error creating conversation:', convError);
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    // Fetch the complete conversation with other user's profile
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (fetchError || !conversation) {
      console.error('Error fetching conversation:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch conversation' },
        { status: 500 }
      );
    }

    // Get other user's profile
    const otherUserId_actual = conversation.user1_id === session.user.id 
      ? conversation.user2_id 
      : conversation.user1_id;

    const { data: otherUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', otherUserId_actual)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // Return conversation with other user's profile
    return NextResponse.json({
      conversation: {
        ...conversation,
        other_user_profile: otherUserProfile,
        unread_count: 0
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in create conversation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check if conversation exists between users
 * 
 * Query params:
 * - otherUserId: UUID of the other user
 * 
 * Returns conversation if exists, 404 if not
 */
export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get('otherUserId');

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'otherUserId is required' },
        { status: 400 }
      );
    }

    // Query for existing conversation
    const { data: conversations, error: queryError } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${session.user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${session.user.id})`);

    if (queryError) {
      console.error('Error querying conversation:', queryError);
      return NextResponse.json(
        { error: 'Failed to query conversation' },
        { status: 500 }
      );
    }

    if (!conversations || conversations.length === 0) {
      return NextResponse.json(
        { exists: false },
        { status: 404 }
      );
    }

    // Get other user's profile
    const conversation = conversations[0];
    const otherUserId_actual = conversation.user1_id === session.user.id 
      ? conversation.user2_id 
      : conversation.user1_id;

    const { data: otherUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', otherUserId_actual)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // Get unread count
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversation.id)
      .eq('read', false)
      .neq('sender_id', session.user.id);

    return NextResponse.json({
      exists: true,
      conversation: {
        ...conversation,
        other_user_profile: otherUserProfile,
        unread_count: count || 0
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in get conversation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
