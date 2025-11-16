/**
 * Commission Status Update API Route
 * PATCH /api/revenue/commission-status
 * 
 * Admin-only route to update commission statuses
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

interface UpdateCommissionStatus {
  commissionId: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  notes?: string;
}

async function verifyAdminRole(supabase: any, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) throw error;
    
    return data?.role === 'admin';
  } catch (err) {
    console.error('Error verifying admin role:', err);
    return false;
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const isAdmin = await verifyAdminRole(supabase, session.user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body: UpdateCommissionStatus = await request.json();
    const { commissionId, status, notes } = body;

    if (!commissionId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: commissionId, status' },
        { status: 400 }
      );
    }

    const updateData: any = {
      status,
      notes: notes || null,
      updated_at: new Date().toISOString()
    };

    if (status === 'approved') {
      updateData.approved_date = new Date().toISOString();
      updateData.approved_by = session.user.id;
    }

    if (status === 'paid') {
      updateData.paid_date = new Date().toISOString();
      if (!updateData.approved_date) {
        updateData.approved_date = new Date().toISOString();
        updateData.approved_by = session.user.id;
      }
    }

    const { data: commission, error: updateError } = await supabase
      .from('commission_records')
      .update(updateData)
      .eq('id', commissionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating commission status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update commission status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      commission
    });

  } catch (error) {
    console.error('Error in PATCH /api/revenue/commission-status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
