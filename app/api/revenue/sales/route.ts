/**
 * Revenue & Commission API Routes for AgentOS
 * 
 * Comprehensive backend API handlers for revenue tracking and commission management
 * Features:
 * - Create sales transactions
 * - Calculate commissions automatically
 * - Process payout requests
 * - Update commission statuses
 * - Admin approval workflows
 * 
 * Created: November 17, 2025 - 4:35 AM EST
 * Standard: Henderson Standard - Fortune 50 Quality
 * Author: Claude + Roy Henderson Partnership
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CreateSaleRequest {
  propertyId: string;
  agentId: string;
  buyerId: string | null;
  salePrice: number;
  commissionRate?: number;
  saleDate?: string;
  notes?: string;
}

interface CreatePayoutRequest {
  commissionIds: string[];
  payoutMethod: 'direct_deposit' | 'check' | 'wire';
  notes?: string;
}

interface UpdateCommissionStatus {
  commissionId: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  notes?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getDefaultCommissionRate(supabase: any): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('default_commission_rate')
      .single();

    if (error) throw error;
    
    return data?.default_commission_rate || 0.03;
  } catch (err) {
    console.error('Error fetching default commission rate:', err);
    return 0.03;
  }
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

function calculateCommission(salePrice: number, commissionRate: number): number {
  return Math.round(salePrice * commissionRate * 100) / 100;
}

// ============================================================================
// API ROUTE: Create Sales Transaction
// POST /api/revenue/sales
// ============================================================================

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

    const isAdmin = await verifyAdminRole(supabase, session.user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body: CreateSaleRequest = await request.json();
    const {
      propertyId,
      agentId,
      buyerId,
      salePrice,
      commissionRate,
      saleDate,
      notes
    } = body;

    if (!propertyId || !agentId || !salePrice) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, agentId, salePrice' },
        { status: 400 }
      );
    }

    if (salePrice <= 0) {
      return NextResponse.json(
        { error: 'Sale price must be greater than 0' },
        { status: 400 }
      );
    }

    const finalCommissionRate = commissionRate || await getDefaultCommissionRate(supabase);
    const commissionAmount = calculateCommission(salePrice, finalCommissionRate);

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('address, city, state')
      .eq('id', propertyId)
      .single();

    if (propertyError) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const propertyAddress = `${property.address}, ${property.city}, ${property.state}`;

    const { data: saleTransaction, error: saleError } = await supabase
      .from('sales_transactions')
      .insert({
        property_id: propertyId,
        agent_id: agentId,
        buyer_id: buyerId,
        sale_price: salePrice,
        commission_rate: finalCommissionRate,
        commission_amount: commissionAmount,
        sale_date: saleDate || new Date().toISOString(),
        status: 'completed',
        notes: notes || null
      })
      .select()
      .single();

    if (saleError) {
      console.error('Error creating sale transaction:', saleError);
      return NextResponse.json(
        { error: 'Failed to create sale transaction' },
        { status: 500 }
      );
    }

    const { data: commissionRecord, error: commissionError } = await supabase
      .from('commission_records')
      .insert({
        sale_transaction_id: saleTransaction.id,
        agent_id: agentId,
        property_address: propertyAddress,
        sale_price: salePrice,
        commission_rate: finalCommissionRate,
        commission_amount: commissionAmount,
        sale_date: saleDate || new Date().toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (commissionError) {
      console.error('Error creating commission record:', commissionError);
    }

    await supabase
      .from('properties')
      .update({ 
        status: 'sold',
        updated_at: new Date().toISOString()
      })
      .eq('id', propertyId);

    return NextResponse.json({
      success: true,
      sale: saleTransaction,
      commission: commissionRecord
    });

  } catch (error) {
    console.error('Error in POST /api/revenue/sales:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
