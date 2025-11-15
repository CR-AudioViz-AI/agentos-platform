'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams, useRouter } from 'next/navigation';
import {
  Home, Users, TrendingUp, Calendar, MessageSquare, Settings, PlusCircle,
  BarChart3, DollarSign, Eye, Edit, Trash2, MapPin, Bed, Bath, Square,
  Mail, Phone, Clock, Star, Filter, Search, X, Upload, Image as ImageIcon
} from 'lucide-react';

export default function AgentDashboard() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [properties, setProperties] = useState([]);
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeListings: 0,
    totalLeads: 0,
    newLeads: 0,
    totalValue: 0,
    monthlyRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Property form state
  const [propertyForm, setPropertyForm] = useState({
    title: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    square_feet: '',
    property_type: 'residential',
    listing_type: 'sale',
    description: '',
    features: [],
    images: []
  });

  const supabase = createClientComponentClient();
  const companySlug = params.company;

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Load user profile to get company_id
      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id, role')
        .eq('id', user.id)
        .single();

      if (!userProfile || userProfile.role === 'customer') {
        router.push('/customer');
        return;
      }

      // Load properties
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      setProperties(propertiesData || []);

      // Load leads
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      setLeads(leadsData || []);

      // Calculate stats
      const activeListings = propertiesData?.filter(p => p.status === 'active').length || 0;
      const newLeads = leadsData?.filter(l => l.status === 'new').length || 0;
      const totalValue = propertiesData?.reduce((sum, p) => sum + (p.price || 0), 0) || 0;

      setStats({
        totalProperties: propertiesData?.length || 0,
        activeListings,
        totalLeads: leadsData?.length || 0,
        newLeads,
        totalValue,
        monthlyRevenue: 0 // Calculate from transactions
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProperty = async (e) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('properties')
        .insert({
          ...propertyForm,
          company_id: userProfile.company_id,
          listing_agent_id: user.id,
          status: 'active',
          show_on_homefinder: true,
          price: parseFloat(propertyForm.price),
          bedrooms: parseInt(propertyForm.bedrooms),
          bathrooms: parseFloat(propertyForm.bathrooms),
          square_feet: parseInt(propertyForm.square_feet)
        });

      if (error) throw error;

      alert('Property added successfully!');
      setShowAddProperty(false);
      resetPropertyForm();
      loadDashboardData();
    } catch (error) {
      console.error('Error adding property:', error);
      alert('Error adding property. Please try again.');
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    if (!confirm('Are you sure you want to delete this property?')) return;

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;

      alert('Property deleted successfully!');
      loadDashboardData();
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Error deleting property.');
    }
  };

  const resetPropertyForm = () => {
    setPropertyForm({
      title: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      price: '',
      bedrooms: '',
      bathrooms: '',
      square_feet: '',
      property_type: 'residential',
      listing_type: 'sale',
      description: '',
      features: [],
      images: []
    });
    setEditingProperty(null);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getLeadStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-purple-100 text-purple-800',
      nurturing: 'bg-orange-100 text-orange-800',
      converted: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-gray-900">AgentOS Dashboard</h1>
              <span className="text-sm text-gray-600">Company: {companySlug}</span>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-gray-700 hover:text-gray-900">
                <Settings size={20} />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  A
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] sticky top-16">
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'overview'
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <BarChart3 size={20} />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'properties'
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Home size={20} />
              Properties
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'leads'
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users size={20} />
              Leads
              {stats.newLeads > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {stats.newLeads}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'analytics'
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <TrendingUp size={20} />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'calendar'
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Calendar size={20} />
              Calendar
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'messages'
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <MessageSquare size={20} />
              Messages
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
                <p className="text-gray-600">Here's what's happening with your business today.</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Home className="text-blue-600" size={24} />
                    </div>
                    <span className="text-sm text-green-600 font-semibold">+12%</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalProperties}</div>
                  <div className="text-sm text-gray-600">Total Properties</div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <TrendingUp className="text-green-600" size={24} />
                    </div>
                    <span className="text-sm text-green-600 font-semibold">Active</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{stats.activeListings}</div>
                  <div className="text-sm text-gray-600">Active Listings</div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Users className="text-purple-600" size={24} />
                    </div>
                    {stats.newLeads > 0 && (
                      <span className="text-sm text-red-600 font-semibold">{stats.newLeads} new</span>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalLeads}</div>
                  <div className="text-sm text-gray-600">Total Leads</div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <DollarSign className="text-yellow-600" size={24} />
                    </div>
                    <span className="text-sm text-green-600 font-semibold">+8%</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{formatPrice(stats.totalValue)}</div>
                  <div className="text-sm text-gray-600">Portfolio Value</div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Recent Properties</h3>
                  </div>
                  <div className="p-6">
                    {properties.slice(0, 5).map((property) => (
                      <div key={property.id} className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100 last:border-0">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                          {property.images?.[0] && (
                            <img src={property.images[0]} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{property.title}</h4>
                          <p className="text-sm text-gray-600">{property.city}, {property.state}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">{formatPrice(property.price)}</div>
                          <div className="text-xs text-gray-600">{property.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Recent Leads</h3>
                  </div>
                  <div className="p-6">
                    {leads.slice(0, 5).map((lead) => (
                      <div key={lead.id} className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100 last:border-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="font-semibold text-blue-600">
                            {lead.first_name?.[0]}{lead.last_name?.[0]}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{lead.first_name} {lead.last_name}</h4>
                          <p className="text-sm text-gray-600">{lead.email}</p>
                        </div>
                        <div>
                          <span className={`text-xs px-2 py-1 rounded-full ${getLeadStatusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Properties Tab */}
          {activeTab === 'properties' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Properties</h2>
                  <p className="text-gray-600">Manage your property listings</p>
                </div>
                <button
                  onClick={() => setShowAddProperty(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  <PlusCircle size={20} />
                  Add Property
                </button>
              </div>

              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search properties..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Properties List */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Property
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {properties
                      .filter(p => 
                        searchQuery === '' || 
                        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.city.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((property) => (
                      <tr key={property.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                              {property.images?.[0] && (
                                <img src={property.images[0]} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{property.title}</div>
                              <div className="text-sm text-gray-600">{property.address}, {property.city}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{formatPrice(property.price)}</div>
                          <div className="text-sm text-gray-600">{property.listing_type}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Bed size={14} />
                              {property.bedrooms}
                            </span>
                            <span className="flex items-center gap-1">
                              <Bath size={14} />
                              {property.bathrooms}
                            </span>
                            <span className="flex items-center gap-1">
                              <Square size={14} />
                              {property.square_feet?.toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            property.status === 'active' ? 'bg-green-100 text-green-800' :
                            property.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            property.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {property.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button className="p-2 text-blue-600 hover:bg-blue-50 rounded transition">
                              <Eye size={16} />
                            </button>
                            <button className="p-2 text-gray-600 hover:bg-gray-50 rounded transition">
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteProperty(property.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Leads Tab */}
          {activeTab === 'leads' && (
            <div>
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Leads</h2>
                <p className="text-gray-600">Manage your potential clients</p>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="font-semibold text-blue-600">
                                {lead.first_name?.[0]}{lead.last_name?.[0]}
                              </span>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{lead.first_name} {lead.last_name}</div>
                              <div className="text-sm text-gray-600">{lead.lead_type || 'buyer'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{lead.email}</div>
                          {lead.phone && (
                            <div className="text-sm text-gray-600">{lead.phone}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                            {lead.source}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getLeadStatusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{formatDate(lead.created_at)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Property Modal */}
      {showAddProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-3xl w-full my-8">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">Add New Property</h3>
              <button
                onClick={() => {
                  setShowAddProperty(false);
                  resetPropertyForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddProperty} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={propertyForm.title}
                    onChange={(e) => setPropertyForm({ ...propertyForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Beautiful 3BR Home with Pool"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    required
                    value={propertyForm.address}
                    onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123 Main Street"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={propertyForm.city}
                    onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={propertyForm.state}
                    onChange={(e) => setPropertyForm({ ...propertyForm, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="FL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                  <input
                    type="text"
                    required
                    value={propertyForm.zip}
                    onChange={(e) => setPropertyForm({ ...propertyForm, zip: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <input
                    type="number"
                    required
                    value={propertyForm.price}
                    onChange={(e) => setPropertyForm({ ...propertyForm, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="450000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                  <input
                    type="number"
                    required
                    value={propertyForm.bedrooms}
                    onChange={(e) => setPropertyForm({ ...propertyForm, bedrooms: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={propertyForm.bathrooms}
                    onChange={(e) => setPropertyForm({ ...propertyForm, bathrooms: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
                  <input
                    type="number"
                    required
                    value={propertyForm.square_feet}
                    onChange={(e) => setPropertyForm({ ...propertyForm, square_feet: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                  <select
                    value={propertyForm.property_type}
                    onChange={(e) => setPropertyForm({ ...propertyForm, property_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="land">Land</option>
                    <option value="rental">Rental</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Listing Type</label>
                  <select
                    value={propertyForm.listing_type}
                    onChange={(e) => setPropertyForm({ ...propertyForm, listing_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={4}
                    value={propertyForm.description}
                    onChange={(e) => setPropertyForm({ ...propertyForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the property..."
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProperty(false);
                    resetPropertyForm();
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  Add Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
