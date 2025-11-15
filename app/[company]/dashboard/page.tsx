'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Home, Users, TrendingUp, Plus, Search } from 'lucide-react';
import Link from 'next/link';

export default function CompanyDashboard({ params }: { params: { company: string } }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [properties, setProperties] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [props, ldz] = await Promise.all([
      supabase.from('properties').select('*').limit(10),
      supabase.from('leads').select('*').limit(10)
    ]);
    setProperties(props.data || []);
    setLeads(ldz.data || []);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Home className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold capitalize">{params.company} Dashboard</h1>
          </div>
          <Link href="/" className="text-sm text-gray-600">← Home</Link>
        </div>
      </header>

      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-8">
            {['overview', 'properties', 'leads', 'transactions', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-2xl font-bold mb-1">{properties.length}</h3>
                <p className="text-sm font-medium text-gray-600">Active Listings</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-2xl font-bold mb-1">{leads.length}</h3>
                <p className="text-sm font-medium text-gray-600">Hot Leads</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-2xl font-bold mb-1">$2.4M</h3>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Recent Properties</h2>
                <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
                  <Plus className="w-4 h-4" />
                  Add Property
                </button>
              </div>
              <div className="space-y-4">
                {properties.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium">{p.address_line1}</h3>
                      <p className="text-sm text-gray-600">{p.city}, {p.state}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${(p.list_price / 1000).toFixed(0)}K</p>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'properties' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">All Properties</h2>
              <div className="flex gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search properties..."
                    className="pl-10 pr-4 py-2 border rounded-lg"
                  />
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {properties.map((p) => (
                <div key={p.id} className="border rounded-lg overflow-hidden">
                  <div className="h-40 bg-gray-200 flex items-center justify-center">
                    <Home className="w-12 h-12 text-gray-400" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-1">${p.list_price.toLocaleString()}</h3>
                    <p className="text-sm text-gray-600">{p.address_line1}</p>
                    <p className="text-sm text-gray-500">{p.city}, {p.state}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">All Leads</h2>
            <div className="space-y-4">
              {leads.map((lead) => (
                <div key={lead.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium">{lead.first_name} {lead.last_name}</h3>
                    <p className="text-sm text-gray-600">{lead.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">Score: {lead.lead_score || 0}</p>
                    <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full capitalize">
                      {lead.priority || 'medium'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
