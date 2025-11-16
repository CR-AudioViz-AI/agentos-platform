/**
 * Payout Request API Route
 * POST /api/revenue/payout-request
 * 
 * Allows agents to request commission payouts
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

interface CreatePayoutRequest {
  commissionIds: string[];
  payoutMethod: 'direct_deposit' | 'check' | 'wire';
  notes?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: CreatePayoutRequest = await request.json();
    const { commissionIds, payoutMethod, notes } = body;

    if (!commissionIds || commissionIds.length === 0) {
      return NextResponse.json(
        { error: 'No commissions selected' },
        { status: 400 }
      );
    }

    if (!payoutMethod) {
      return NextResponse.json(
        { error: 'Payout method is required' },
        { status: 400 }
      );
    }

    const { data: commissions, error: commissionError } = await supabase
      .from('commission_records')
      .select('id, agent_id, commission_amount, status')
      .in('id', commissionIds);

    if (commissionError) {
      return NextResponse.json(
        { error: 'Failed to fetch commissions' },
        { status: 500 }
      );
    }

    const invalidCommissions = commissions?.filter(
      c => c.agent_id !== session.user.id || c.status !== 'pending'
    );

    if (invalidCommissions && invalidCommissions.length > 0) {
      return NextResponse.json(
        { error: 'Invalid commission selection: commissions must be owned by you and in pending status' },
        { status: 403 }
      );
    }

    const totalAmount = commissions?.reduce((sum, c) => sum + c.commission_amount, 0) || 0;

    const { data: payoutRequest, error: payoutError } = await supabase
      .from('payout_requests')
      .insert({
        agent_id: session.user.id,
        commission_ids: commissionIds,
        total_amount: totalAmount,
        payout_method: payoutMethod,
        notes: notes || null,
        status: 'pending',
        requested_at: new Date().toISOString()
      })
      .select()
      .single();

    if (payoutError) {
      console.error('Error creating payout request:', payoutError);
      return NextResponse.json(
        { error: 'Failed to create payout request' },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from('commission_records')
      .update({ 
        status: 'approved',
        approved_date: new Date().toISOString()
      })
      .in('id', commissionIds);

    if (updateError) {
      console.error('Error updating commission statuses:', updateError);
    }

    return NextResponse.json({
      success: true,
      payoutRequest
    });

  } catch (error) {
    console.error('Error in POST /api/revenue/payout-request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
