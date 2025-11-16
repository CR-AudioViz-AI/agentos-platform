'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { DollarSign, TrendingUp, TrendingDown, Users, Home, Calendar } from 'lucide-react';

interface RevenueStats {
  totalSales: number;
  totalCommissions: number;
  activeListing: number;
  completedDeals: number;
  averageCommissionRate: number;
  monthlyRevenue: { month: string; amount: number }[];
}

export default function RevenueDashboard({ agentId }: { agentId: string }) {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchRevenueStats();
  }, [agentId]);

  const fetchRevenueStats = async () => {
    try {
      const [salesData, commissionsData, propertiesData] = await Promise.all([
        supabase.from('sales_transactions').select('*').eq('agent_id', agentId),
        supabase.from('commission_records').select('*').eq('agent_id', agentId),
        supabase.from('properties').select('*').eq('agent_id', agentId)
      ]);

      const totalSales = salesData.data?.reduce((sum, t) => sum + t.sale_price, 0) || 0;
      const totalCommissions = commissionsData.data?.reduce((sum, c) => sum + c.commission_amount, 0) || 0;
      const activeListing = propertiesData.data?.filter(p => p.status === 'active').length || 0;
      const completedDeals = salesData.data?.length || 0;
      const avgRate = salesData.data?.reduce((sum, t) => sum + t.commission_rate, 0) / (salesData.data?.length || 1) || 0;

      setStats({
        totalSales,
        totalCommissions,
        activeListing,
        completedDeals,
        averageCommissionRate: avgRate,
        monthlyRevenue: []
      });
    } catch (error) {
      console.error('Error fetching revenue stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return <div className="flex justify-center items-center p-8"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSales)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Commissions</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalCommissions)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Listings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeListing}</p>
            </div>
            <Home className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed Deals</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedDeals}</p>
            </div>
            <Calendar className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
