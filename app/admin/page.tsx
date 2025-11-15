'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Users, Building2, DollarSign, TrendingUp, Activity, Home } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ orgs: 0, agents: 0, mrr: 0, properties: 0 });
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const [orgs, profiles, props] = await Promise.all([
      supabase.from('organizations').select('monthly_fee'),
      supabase.from('profiles').select('role'),
      supabase.from('properties').select('id')
    ]);

    const agents = profiles.data?.filter(p => ['agent', 'broker'].includes(p.role)).length || 0;
    const mrr = orgs.data?.reduce((sum, o) => sum + (o.monthly_fee || 0), 0) || 0;

    setStats({
      orgs: orgs.data?.length || 0,
      agents,
      mrr,
      properties: props.data?.length || 0
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Home className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">AgentOS Admin</h1>
          </div>
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">← Back to Site</Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-1">{stats.orgs}</h3>
            <p className="text-sm font-medium text-gray-600">Organizations</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-1">{stats.agents}</h3>
            <p className="text-sm font-medium text-gray-600">Total Agents</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-50 text-green-600">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-1">${stats.mrr.toLocaleString()}</h3>
            <p className="text-sm font-medium text-gray-600">Monthly Recurring Revenue</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-orange-50 text-orange-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-1">{stats.properties}</h3>
            <p className="text-sm font-medium text-gray-600">Active Properties</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Platform Status</h2>
          <div className="flex items-center gap-2 text-green-600">
            <Activity className="w-5 h-5" />
            <span className="font-medium">All Systems Operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}
