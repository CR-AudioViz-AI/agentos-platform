/**
 * AgentOS Calendar/Scheduling API Routes
 * 
 * All API endpoints for availability management and tour scheduling
 * Created: November 17, 2025 - 3:45 AM EST
 * Standard: Henderson Standard - Fortune 50 Quality
 */

// ============================================================================
// FILE 1: /app/api/availability/slots/route.ts
// Get available time slots for an agent on a specific date
// ============================================================================

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

export async function GET_SLOTS(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const date = searchParams.get('date');
    const durationMinutes = parseInt(searchParams.get('duration') || '60');
    const intervalMinutes = parseInt(searchParams.get('interval') || '30');

    // Validate parameters
    if (!agentId || !date) {
      return NextResponse.json(
        { error: 'agentId and date are required' },
        { status: 400 }
      );
    }

    // Call database function to get available slots
    const { data, error } = await supabase.rpc('get_available_slots', {
      p_agent_id: agentId,
      p_date: date,
      p_duration_minutes: durationMinutes,
      p_slot_interval_minutes: intervalMinutes
    });

    if (error) {
      console.error('Error fetching available slots:', error);
      return NextResponse.json(
        { error: 'Failed to fetch available slots' },
        { status: 500 }
      );
    }

    return NextResponse.json({ slots: data || [] }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in get slots API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// FILE 2: /app/api/availability/manage/route.ts
// Manage agent availability (create, update, delete)
// ============================================================================

export async function POST_AVAILABILITY(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is an agent
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || profile?.role !== 'agent') {
      return NextResponse.json(
        { error: 'Only agents can manage availability' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { availabilityType, ...availabilityData } = body;

    // Validate availability type
    if (!['recurring', 'one_time', 'blackout'].includes(availabilityType)) {
      return NextResponse.json(
        { error: 'Invalid availability type' },
        { status: 400 }
      );
    }

    // Insert availability record
    const { data, error: insertError } = await supabase
      .from('agent_availability')
      .insert({
        agent_id: session.user.id,
        availability_type: availabilityType,
        ...availabilityData,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating availability:', insertError);
      return NextResponse.json(
        { error: 'Failed to create availability' },
        { status: 500 }
      );
    }

    return NextResponse.json({ availability: data }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in create availability API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT_AVAILABILITY(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Availability ID required' }, { status: 400 });
    }

    // Update availability (RLS will ensure user owns it)
    const { data, error: updateError } = await supabase
      .from('agent_availability')
      .update(updates)
      .eq('id', id)
      .eq('agent_id', session.user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating availability:', updateError);
      return NextResponse.json(
        { error: 'Failed to update availability' },
        { status: 500 }
      );
    }

    return NextResponse.json({ availability: data }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in update availability API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE_AVAILABILITY(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Availability ID required' }, { status: 400 });
    }

    // Delete availability (RLS will ensure user owns it)
    const { error: deleteError } = await supabase
      .from('agent_availability')
      .delete()
      .eq('id', id)
      .eq('agent_id', session.user.id);

    if (deleteError) {
      console.error('Error deleting availability:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete availability' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in delete availability API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// FILE 3: /app/api/tours/schedule/route.ts
// Schedule a new tour with validation
// ============================================================================

export async function POST_SCHEDULE_TOUR(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { propertyId, agentId, scheduledFor, tourType, notes } = body;

    // Validate required fields
    if (!propertyId || !agentId || !scheduledFor) {
      return NextResponse.json(
        { error: 'propertyId, agentId, and scheduledFor are required' },
        { status: 400 }
      );
    }

    // Use database function to schedule with validation
    const { data: tourId, error: scheduleError } = await supabase.rpc(
      'schedule_tour_with_validation',
      {
        p_property_id: propertyId,
        p_buyer_id: session.user.id,
        p_agent_id: agentId,
        p_scheduled_for: scheduledFor,
        p_tour_type: tourType || 'in_person',
        p_notes: notes || null
      }
    );

    if (scheduleError) {
      console.error('Error scheduling tour:', scheduleError);
      return NextResponse.json(
        { error: scheduleError.message || 'Failed to schedule tour' },
        { status: 400 }
      );
    }

    // Fetch the complete tour details
    const { data: tour, error: fetchError } = await supabase
      .from('tours')
      .select(`
        *,
        property:property_id(*),
        buyer:buyer_id(*),
        agent:agent_id(*)
      `)
      .eq('id', tourId)
      .single();

    if (fetchError) {
      console.error('Error fetching tour:', fetchError);
    }

    return NextResponse.json(
      { tourId, tour },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Unexpected error in schedule tour API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// FILE 4: /app/api/tours/reschedule/route.ts
// Reschedule an existing tour
// ============================================================================

export async function PUT_RESCHEDULE_TOUR(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { tourId, newDateTime, reason } = body;

    // Validate required fields
    if (!tourId || !newDateTime) {
      return NextResponse.json(
        { error: 'tourId and newDateTime are required' },
        { status: 400 }
      );
    }

    // Verify tour exists and user has access
    const { data: existingTour, error: tourError } = await supabase
      .from('tours')
      .select('buyer_id, agent_id')
      .eq('id', tourId)
      .single();

    if (tourError || !existingTour) {
      return NextResponse.json(
        { error: 'Tour not found' },
        { status: 404 }
      );
    }

    // Check if user is buyer or agent
    if (
      existingTour.buyer_id !== session.user.id &&
      existingTour.agent_id !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to reschedule this tour' },
        { status: 403 }
      );
    }

    // Use database function to reschedule with validation
    const { data: success, error: rescheduleError } = await supabase.rpc(
      'reschedule_tour',
      {
        p_tour_id: tourId,
        p_new_datetime: newDateTime,
        p_reason: reason || null
      }
    );

    if (rescheduleError) {
      console.error('Error rescheduling tour:', rescheduleError);
      return NextResponse.json(
        { error: rescheduleError.message || 'Failed to reschedule tour' },
        { status: 400 }
      );
    }

    // Fetch updated tour
    const { data: tour, error: fetchError } = await supabase
      .from('tours')
      .select(`
        *,
        property:property_id(*),
        buyer:buyer_id(*),
        agent:agent_id(*)
      `)
      .eq('id', tourId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated tour:', fetchError);
    }

    return NextResponse.json({ tour }, { status: 200 });

  } catch (error: any) {
    console.error('Unexpected error in reschedule tour API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// FILE 5: /app/api/tours/calendar-invite/route.ts
// Generate .ics calendar invitation file
// ============================================================================

export async function GET_CALENDAR_INVITE(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const tourId = searchParams.get('tourId');

    if (!tourId) {
      return NextResponse.json(
        { error: 'tourId is required' },
        { status: 400 }
      );
    }

    // Fetch tour details
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select(`
        *,
        property:property_id(*),
        buyer:buyer_id(*),
        agent:agent_id(*)
      `)
      .eq('id', tourId)
      .single();

    if (tourError || !tour) {
      return NextResponse.json(
        { error: 'Tour not found' },
        { status: 404 }
      );
    }

    // Generate .ics content
    const startDate = new Date(tour.scheduled_for);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AgentOS//Tour Booking//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:tour-${tourId}@agentos.com`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:Property Tour - ${tour.property.address}`,
      `DESCRIPTION:Property Tour\\n\\nProperty: ${tour.property.address}\\n${tour.property.city}, ${tour.property.state}\\n\\nAgent: ${tour.agent.full_name}\\nBuyer: ${tour.buyer.full_name}\\n\\nType: ${tour.tour_type}${tour.notes ? '\\n\\nNotes: ' + tour.notes : ''}`,
      `LOCATION:${tour.property.address}, ${tour.property.city}, ${tour.property.state} ${tour.property.zip_code}`,
      `STATUS:CONFIRMED`,
      `ORGANIZER;CN="${tour.agent.full_name}":mailto:${tour.agent.email}`,
      `ATTENDEE;CN="${tour.buyer.full_name}";RSVP=TRUE:mailto:${tour.buyer.email}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Property Tour in 1 hour',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    // Return as downloadable .ics file
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="tour-${tourId}.ics"`
      }
    });

  } catch (error) {
    console.error('Unexpected error in calendar invite API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// EXPORTS NOTE:
// Each function above should be in its own separate file as indicated
// This combined file is for documentation/upload purposes
// ============================================================================
