'use client';

/**
 * CommissionTracking Component
 * 
 * Detailed commission tracking and payout management for AgentOS
 * Features:
 * - Individual agent commission tracking
 * - Pending vs paid commission breakdown
 * - Commission payout requests
 * - Commission history with filters
 * - Automated commission calculations
 * - Payout approval workflow (admin)
 * - Export commission statements
 * 
 * Created: November 17, 2025 - 4:30 AM EST
 * Standard: Henderson Standard - Fortune 50 Quality
 * Author: Claude + Roy Henderson Partnership
 */

import { useEffect, useState, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import {
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Download,
  Filter,
  AlertCircle,
  Loader2,
  TrendingUp,
  Calendar,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type Profile = Database['public']['Tables']['profiles']['Row'];

interface Commission {
  id: string;
  agent: Profile;
  saleId: string;
  propertyAddress: string;
  salePrice: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  saleDate: string;
  paidDate: string | null;
  approvedDate: string | null;
  approvedBy: string | null;
  payoutMethod: 'direct_deposit' | 'check' | 'wire' | null;
  notes: string | null;
  createdAt: string;
}

interface CommissionStats {
  totalPending: number;
  totalApproved: number;
  totalPaid: number;
  totalLifetime: number;
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
}

interface PayoutRequest {
  commissionIds: string[];
  totalAmount: number;
  payoutMethod: 'direct_deposit' | 'check' | 'wire';
  notes?: string;
}

interface CommissionTrackingProps {
  userRole: 'admin' | 'agent';
  userId?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CommissionTracking({ userRole, userId }: CommissionTrackingProps) {
  const supabase = createClientComponentClient<Database>();

  // State Management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState<CommissionStats>({
    totalPending: 0,
    totalApproved: 0,
    totalPaid: 0,
    totalLifetime: 0,
    pendingCount: 0,
    approvedCount: 0,
    paidCount: 0
  });

  // Filter State
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'paid' | 'cancelled'>('all');
  const [selectedCommissions, setSelectedCommissions] = useState<Set<string>>(new Set());

  // Payout Request State
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'direct_deposit' | 'check' | 'wire'>('direct_deposit');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [submittingPayout, setSubmittingPayout] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchCommissions = async () => {
    try {
      setError(null);

      let query = supabase
        .from('commission_records')
        .select(`
          *,
          agent:profiles!commission_records_agent_id_fkey(*),
          approved_by_user:profiles!commission_records_approved_by_fkey(*)
        `);

      // Filter by agent if not admin
      if (userRole === 'agent' && userId) {
        query = query.eq('agent_id', userId);
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (!data) {
        setCommissions([]);
        return;
      }

      // Process commission data
      const processedCommissions: Commission[] = data.map(record => ({
        id: record.id,
        agent: record.agent as Profile,
        saleId: record.sale_transaction_id,
        propertyAddress: record.property_address,
        salePrice: record.sale_price,
        commissionRate: record.commission_rate,
        commissionAmount: record.commission_amount,
        status: record.status as 'pending' | 'approved' | 'paid' | 'cancelled',
        saleDate: record.sale_date,
        paidDate: record.paid_date,
        approvedDate: record.approved_date,
        approvedBy: record.approved_by,
        payoutMethod: record.payout_method as 'direct_deposit' | 'check' | 'wire' | null,
        notes: record.notes,
        createdAt: record.created_at
      }));

      setCommissions(processedCommissions);

      // Calculate stats
      const pending = processedCommissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.commissionAmount, 0);

      const approved = processedCommissions
        .filter(c => c.status === 'approved')
        .reduce((sum, c) => sum + c.commissionAmount, 0);

      const paid = processedCommissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + c.commissionAmount, 0);

      const lifetime = processedCommissions
        .reduce((sum, c) => sum + c.commissionAmount, 0);

      setStats({
        totalPending: pending,
        totalApproved: approved,
        totalPaid: paid,
        totalLifetime: lifetime,
        pendingCount: processedCommissions.filter(c => c.status === 'pending').length,
        approvedCount: processedCommissions.filter(c => c.status === 'approved').length,
        paidCount: processedCommissions.filter(c => c.status === 'paid').length
      });

    } catch (err) {
      console.error('Error fetching commissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load commission data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('commission-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commission_records'
        },
        () => {
          console.log('Commission record changed, refreshing data...');
          fetchCommissions();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userRole, userId]);

  // ============================================================================
  // PAYOUT REQUEST SUBMISSION
  // ============================================================================

  const submitPayoutRequest = async () => {
    try {
      setSubmittingPayout(true);
      setError(null);

      const selectedIds = Array.from(selectedCommissions);

      if (selectedIds.length === 0) {
        setError('Please select at least one commission to request payout');
        return;
      }

      // Calculate total amount
      const totalAmount = commissions
        .filter(c => selectedIds.includes(c.id))
        .reduce((sum, c) => sum + c.commissionAmount, 0);

      // Create payout request
      const { error: requestError } = await supabase
        .from('payout_requests')
        .insert({
          agent_id: userId!,
          commission_ids: selectedIds,
          total_amount: totalAmount,
          payout_method: payoutMethod,
          notes: payoutNotes || null,
          status: 'pending',
          requested_at: new Date().toISOString()
        });

      if (requestError) throw requestError;

      // Update commission statuses to 'approved' (pending admin final approval)
      const { error: updateError } = await supabase
        .from('commission_records')
        .update({ status: 'approved', approved_date: new Date().toISOString() })
        .in('id', selectedIds);

      if (updateError) throw updateError;

      // Reset state
      setSelectedCommissions(new Set());
      setShowPayoutModal(false);
      setPayoutNotes('');
      
      // Refresh data
      await fetchCommissions();

      alert('Payout request submitted successfully!');

    } catch (err) {
      console.error('Error submitting payout request:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit payout request');
    } finally {
      setSubmittingPayout(false);
    }
  };

  // ============================================================================
  // ADMIN APPROVAL ACTIONS
  // ============================================================================

  const approveCommission = async (commissionId: string) => {
    try {
      const { error: approveError } = await supabase
        .from('commission_records')
        .update({ 
          status: 'approved',
          approved_date: new Date().toISOString(),
          approved_by: userId
        })
        .eq('id', commissionId);

      if (approveError) throw approveError;

      await fetchCommissions();
    } catch (err) {
      console.error('Error approving commission:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve commission');
    }
  };

  const markAsPaid = async (commissionId: string) => {
    try {
      const { error: paidError } = await supabase
        .from('commission_records')
        .update({ 
          status: 'paid',
          paid_date: new Date().toISOString()
        })
        .eq('id', commissionId);

      if (paidError) throw paidError;

      await fetchCommissions();
    } catch (err) {
      console.error('Error marking commission as paid:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark commission as paid');
    }
  };

  // ============================================================================
  // EXPORT TO CSV
  // ============================================================================

  const exportToCSV = () => {
    const headers = [
      'Date',
      'Property',
      'Agent',
      'Sale Price',
      'Commission Rate',
      'Commission Amount',
      'Status',
      'Paid Date'
    ];

    const rows = filteredCommissions.map(c => [
      format(new Date(c.saleDate), 'yyyy-MM-dd'),
      c.propertyAddress,
      `${c.agent.first_name} ${c.agent.last_name}`,
      c.salePrice.toFixed(2),
      `${(c.commissionRate * 100).toFixed(2)}%`,
      c.commissionAmount.toFixed(2),
      c.status,
      c.paidDate ? format(new Date(c.paidDate), 'yyyy-MM-dd') : 'Not paid'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commission-statement-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // ============================================================================
  // FILTERED COMMISSIONS
  // ============================================================================

  const filteredCommissions = useMemo(() => {
    if (statusFilter === 'all') return commissions;
    return commissions.filter(c => c.status === statusFilter);
  }, [commissions, statusFilter]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const toggleCommissionSelection = (id: string) => {
    const newSelection = new Set(selectedCommissions);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedCommissions(newSelection);
  };

  const selectedTotal = useMemo(() => {
    return commissions
      .filter(c => selectedCommissions.has(c.id))
      .reduce((sum, c) => sum + c.commissionAmount, 0);
  }, [commissions, selectedCommissions]);

  // ============================================================================
  // LOADING & ERROR STATES
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading commission data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Error Loading Commission Data</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Commission Tracking</h1>
          <p className="text-gray-600 mt-1">
            {userRole === 'admin' ? 'Manage commission payouts' : 'Track your earnings and request payouts'}
          </p>
        </div>

        <button
          onClick={exportToCSV}
          disabled={filteredCommissions.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export Statement
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.totalPending)}</p>
              <p className="text-sm text-gray-500 mt-2">{stats.pendingCount} commissions</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Approved</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalApproved)}</p>
              <p className="text-sm text-gray-500 mt-2">{stats.approvedCount} commissions</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Paid</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</p>
              <p className="text-sm text-gray-500 mt-2">{stats.paidCount} commissions</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Lifetime Earnings</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalLifetime)}</p>
              <p className="text-sm text-gray-500 mt-2">Total earned</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {userRole === 'agent' && selectedCommissions.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm font-medium text-blue-900">
                {selectedCommissions.size} commission(s) selected
              </p>
              <p className="text-sm text-blue-700">
                Total: <span className="font-bold">{formatCurrency(selectedTotal)}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedCommissions(new Set())}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear Selection
              </button>
              <button
                onClick={() => setShowPayoutModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
                Request Payout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="font-medium text-gray-700">Status:</span>
          
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'paid', 'cancelled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Commission List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Commission History</h2>

        {filteredCommissions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No commissions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {userRole === 'agent' && statusFilter === 'pending' && (
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Select</th>
                  )}
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Property</th>
                  {userRole === 'admin' && (
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Agent</th>
                  )}
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Sale Price</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Commission</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                  {userRole === 'admin' && (
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredCommissions.map((commission) => (
                  <tr key={commission.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {userRole === 'agent' && statusFilter === 'pending' && (
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedCommissions.has(commission.id)}
                          onChange={() => toggleCommissionSelection(commission.id)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        />
                      </td>
                    )}
                    <td className="py-3 px-4 text-gray-700">
                      {format(new Date(commission.saleDate), 'MMM d, yyyy')}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900 max-w-xs truncate">
                        {commission.propertyAddress}
                      </p>
                    </td>
                    {userRole === 'admin' && (
                      <td className="py-3 px-4 text-gray-700">
                        {commission.agent.first_name} {commission.agent.last_name}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right text-gray-700">
                      {formatCurrency(commission.salePrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600">
                      {formatCurrency(commission.commissionAmount)}
                      <span className="text-xs text-gray-500 ml-1">
                        ({(commission.commissionRate * 100).toFixed(1)}%)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        commission.status === 'paid' 
                          ? 'bg-green-100 text-green-800'
                          : commission.status === 'approved'
                          ? 'bg-blue-100 text-blue-800'
                          : commission.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {commission.status}
                      </span>
                    </td>
                    {userRole === 'admin' && (
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {commission.status === 'pending' && (
                            <button
                              onClick={() => approveCommission(commission.id)}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              Approve
                            </button>
                          )}
                          {commission.status === 'approved' && (
                            <button
                              onClick={() => markAsPaid(commission.id)}
                              className="text-green-600 hover:text-green-700 text-sm"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Request Commission Payout</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payout Method
                </label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as 'direct_deposit' | 'check' | 'wire')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="direct_deposit">Direct Deposit</option>
                  <option value="check">Check</option>
                  <option value="wire">Wire Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Add any special instructions..."
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Amount:</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedTotal)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedCommissions.size} commission(s) selected
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowPayoutModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitPayoutRequest}
                disabled={submittingPayout}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingPayout ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
