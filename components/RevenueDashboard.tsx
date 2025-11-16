'use client';

/**
 * RevenueDashboard Component
 * 
 * Comprehensive revenue analytics and reporting dashboard for AgentOS
 * Features:
 * - Real-time revenue metrics and KPIs
 * - Revenue by agent leaderboard with drill-down
 * - Commission tracking and breakdowns
 * - Transaction history with filters
 * - Date range analytics (today/week/month/year/custom)
 * - Export to CSV functionality
 * - Real-time Supabase updates
 * - Role-based views (admin sees all, agents see their own)
 * 
 * Created: November 17, 2025 - 4:25 AM EST
 * Standard: Henderson Standard - Fortune 50 Quality
 * Author: Claude + Roy Henderson Partnership
 */

import { useEffect, useState, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Download,
  Loader2,
  AlertCircle,
  RefreshCw,
  Filter,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type Property = Database['public']['Tables']['properties']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface RevenueStats {
  totalRevenue: number;
  totalSales: number;
  totalCommissions: number;
  avgSalePrice: number;
  periodChange: number; // Percentage change from previous period
}

interface AgentRevenue {
  agent: Profile;
  totalSales: number;
  totalRevenue: number;
  totalCommissions: number;
  salesCount: number;
  avgDealSize: number;
}

interface SaleTransaction {
  id: string;
  property: Property;
  agent: Profile;
  buyer: Profile | null;
  salePrice: number;
  commission: number;
  commissionRate: number;
  saleDate: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

type DateRange = 'today' | 'week' | 'month' | 'year' | 'custom';

interface RevenueDashboardProps {
  userRole: 'admin' | 'agent';
  userId?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RevenueDashboard({ userRole, userId }: RevenueDashboardProps) {
  const supabase = createClientComponentClient<Database>();

  // State Management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    totalSales: 0,
    totalCommissions: 0,
    avgSalePrice: 0,
    periodChange: 0
  });
  
  const [agentRevenues, setAgentRevenues] = useState<AgentRevenue[]>([]);
  const [transactions, setTransactions] = useState<SaleTransaction[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // ============================================================================
  // DATE RANGE CALCULATION
  // ============================================================================

  const getDateRangeBounds = useMemo(() => {
    const now = new Date();
    
    switch (dateRange) {
      case 'today':
        return {
          start: new Date(now.setHours(0, 0, 0, 0)),
          end: new Date(now.setHours(23, 59, 59, 999))
        };
      
      case 'week':
        return {
          start: subDays(now, 7),
          end: now
        };
      
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      
      case 'year':
        return {
          start: startOfYear(now),
          end: endOfYear(now)
        };
      
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            start: new Date(customStartDate),
            end: new Date(customEndDate)
          };
        }
        // Fallback to month if custom dates not set
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
    }
  }, [dateRange, customStartDate, customEndDate]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchRevenueData = async () => {
    try {
      setError(null);
      const { start, end } = getDateRangeBounds;

      // Build query based on user role
      let query = supabase
        .from('sales_transactions')
        .select(`
          *,
          property:properties(*),
          agent:profiles!sales_transactions_agent_id_fkey(*),
          buyer:profiles!sales_transactions_buyer_id_fkey(*)
        `)
        .gte('sale_date', start.toISOString())
        .lte('sale_date', end.toISOString())
        .eq('status', 'completed');

      // If agent view, filter to their transactions only
      if (userRole === 'agent' && userId) {
        query = query.eq('agent_id', userId);
      }

      const { data: salesData, error: salesError } = await query.order('sale_date', { ascending: false });

      if (salesError) throw salesError;

      if (!salesData) {
        setTransactions([]);
        setAgentRevenues([]);
        setStats({
          totalRevenue: 0,
          totalSales: 0,
          totalCommissions: 0,
          avgSalePrice: 0,
          periodChange: 0
        });
        return;
      }

      // Process transactions
      const processedTransactions: SaleTransaction[] = salesData.map(sale => ({
        id: sale.id,
        property: sale.property as Property,
        agent: sale.agent as Profile,
        buyer: sale.buyer as Profile | null,
        salePrice: sale.sale_price,
        commission: sale.commission_amount,
        commissionRate: sale.commission_rate,
        saleDate: sale.sale_date,
        status: sale.status as 'pending' | 'completed' | 'cancelled',
        createdAt: sale.created_at
      }));

      setTransactions(processedTransactions);

      // Calculate overall stats
      const totalRevenue = processedTransactions.reduce((sum, t) => sum + t.salePrice, 0);
      const totalCommissions = processedTransactions.reduce((sum, t) => sum + t.commission, 0);
      const avgSalePrice = processedTransactions.length > 0 
        ? totalRevenue / processedTransactions.length 
        : 0;

      // Calculate period change (compare to previous period)
      const periodLength = end.getTime() - start.getTime();
      const previousPeriodStart = new Date(start.getTime() - periodLength);
      const previousPeriodEnd = start;

      const { data: previousData } = await supabase
        .from('sales_transactions')
        .select('sale_price')
        .gte('sale_date', previousPeriodStart.toISOString())
        .lte('sale_date', previousPeriodEnd.toISOString())
        .eq('status', 'completed');

      const previousRevenue = previousData?.reduce((sum, t) => sum + t.sale_price, 0) || 0;
      const periodChange = previousRevenue > 0 
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;

      setStats({
        totalRevenue,
        totalSales: processedTransactions.length,
        totalCommissions,
        avgSalePrice,
        periodChange
      });

      // Calculate agent-level revenues (admin view only)
      if (userRole === 'admin') {
        const agentMap = new Map<string, AgentRevenue>();

        processedTransactions.forEach(transaction => {
          const agentId = transaction.agent.id;
          
          if (!agentMap.has(agentId)) {
            agentMap.set(agentId, {
              agent: transaction.agent,
              totalSales: 0,
              totalRevenue: 0,
              totalCommissions: 0,
              salesCount: 0,
              avgDealSize: 0
            });
          }

          const agentStats = agentMap.get(agentId)!;
          agentStats.totalSales += 1;
          agentStats.totalRevenue += transaction.salePrice;
          agentStats.totalCommissions += transaction.commission;
          agentStats.salesCount += 1;
        });

        // Calculate averages
        const agentRevenueList = Array.from(agentMap.values()).map(agent => ({
          ...agent,
          avgDealSize: agent.salesCount > 0 ? agent.totalRevenue / agent.salesCount : 0
        }));

        // Sort by total revenue descending
        agentRevenueList.sort((a, b) => b.totalRevenue - a.totalRevenue);

        setAgentRevenues(agentRevenueList);
      }

    } catch (err) {
      console.error('Error fetching revenue data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load revenue data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  useEffect(() => {
    fetchRevenueData();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('revenue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_transactions'
        },
        () => {
          console.log('Sales transaction changed, refreshing data...');
          fetchRevenueData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [dateRange, customStartDate, customEndDate, userRole, userId]);

  // ============================================================================
  // EXPORT TO CSV
  // ============================================================================

  const exportToCSV = () => {
    const headers = [
      'Date',
      'Property Address',
      'Agent Name',
      'Buyer Name',
      'Sale Price',
      'Commission Rate',
      'Commission Amount',
      'Status'
    ];

    const rows = transactions.map(t => [
      format(new Date(t.saleDate), 'yyyy-MM-dd'),
      t.property.address,
      `${t.agent.first_name} ${t.agent.last_name}`,
      t.buyer ? `${t.buyer.first_name} ${t.buyer.last_name}` : 'N/A',
      t.salePrice.toFixed(2),
      `${(t.commissionRate * 100).toFixed(2)}%`,
      t.commission.toFixed(2),
      t.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // ============================================================================
  // FILTER TRANSACTIONS BY AGENT
  // ============================================================================

  const filteredTransactions = useMemo(() => {
    if (!selectedAgent) return transactions;
    return transactions.filter(t => t.agent.id === selectedAgent);
  }, [transactions, selectedAgent]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // ============================================================================
  // LOADING & ERROR STATES
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading revenue data...</p>
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
            <h3 className="font-semibold text-red-900 mb-1">Error Loading Revenue Data</h3>
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                fetchRevenueData();
              }}
              className="mt-3 text-sm text-red-600 hover:text-red-700 underline"
            >
              Try Again
            </button>
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
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Revenue Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {userRole === 'admin' ? 'Platform-wide revenue analytics' : 'Your revenue and commissions'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchRevenueData();
            }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={exportToCSV}
            disabled={transactions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-gray-700">Date Range:</span>
          </div>

          <div className="flex gap-2">
            {(['today', 'week', 'month', 'year', 'custom'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-3 ml-auto">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                stats.periodChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stats.periodChange >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{formatPercentage(stats.periodChange)} vs previous</span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSales}</p>
              <p className="text-sm text-gray-500 mt-2">Completed transactions</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Commissions</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalCommissions)}</p>
              <p className="text-sm text-gray-500 mt-2">Agent earnings</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Sale Price</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.avgSalePrice)}</p>
              <p className="text-sm text-gray-500 mt-2">Per transaction</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Agent Leaderboard (Admin Only) */}
      {userRole === 'admin' && agentRevenues.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Agent Performance Leaderboard
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Agent</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Sales</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Revenue</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Commissions</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Deal</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agentRevenues.map((agent, index) => (
                  <tr key={agent.agent.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className={`font-bold ${
                        index === 0 ? 'text-yellow-600' :
                        index === 1 ? 'text-gray-500' :
                        index === 2 ? 'text-orange-600' :
                        'text-gray-400'
                      }`}>
                        #{index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {agent.agent.avatar_url ? (
                          <img
                            src={agent.agent.avatar_url}
                            alt={`${agent.agent.first_name} ${agent.agent.last_name}`}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-xs font-semibold text-gray-600">
                              {agent.agent.first_name[0]}{agent.agent.last_name[0]}
                            </span>
                          </div>
                        )}
                        <span className="font-medium text-gray-900">
                          {agent.agent.first_name} {agent.agent.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">{agent.salesCount}</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">
                      {formatCurrency(agent.totalRevenue)}
                    </td>
                    <td className="py-3 px-4 text-right text-green-600 font-medium">
                      {formatCurrency(agent.totalCommissions)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      {formatCurrency(agent.avgDealSize)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedAgent(
                          selectedAgent === agent.agent.id ? null : agent.agent.id
                        )}
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="text-sm">View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recent Transactions
          </h2>

          {selectedAgent && (
            <button
              onClick={() => setSelectedAgent(null)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear filter
            </button>
          )}
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No transactions found for the selected period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Property</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Agent</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Buyer</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Sale Price</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Commission</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">
                      {format(new Date(transaction.saleDate), 'MMM d, yyyy')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-xs">
                        <p className="font-medium text-gray-900 truncate">
                          {transaction.property.address}
                        </p>
                        <p className="text-sm text-gray-500">
                          {transaction.property.city}, {transaction.property.state}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {transaction.agent.first_name} {transaction.agent.last_name}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {transaction.buyer 
                        ? `${transaction.buyer.first_name} ${transaction.buyer.last_name}`
                        : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">
                      {formatCurrency(transaction.salePrice)}
                    </td>
                    <td className="py-3 px-4 text-right text-green-600 font-medium">
                      {formatCurrency(transaction.commission)}
                      <span className="text-xs text-gray-500 ml-1">
                        ({(transaction.commissionRate * 100).toFixed(1)}%)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : transaction.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
