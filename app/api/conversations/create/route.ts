import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { propertyId, participantIds } = await request.json()
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({ property_id: propertyId })
      .select()
      .single()

    if (convError) throw convError

    const participants = participantIds.map((id: string) => ({
      conversation_id: conversation.id,
      user_id: id
    }))

    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert(participants)

    if (partError) throw partError
    return NextResponse.json({ conversation })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
