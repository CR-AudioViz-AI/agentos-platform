'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Users, DollarSign, Home, TrendingUp, UserCheck, UserX, 
  Shield, Settings, Activity, BarChart3, Eye, Edit, Trash2,
  Search, Filter, Download, RefreshCw, ChevronDown, ChevronUp,
  Mail, Phone, Calendar, Clock, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalAgents: number;
  pendingAgents: number;
  totalProperties: number;
  totalRevenue: number;
  activeListings: number;
  newUsersThisMonth: number;
  revenueThisMonth: number;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  phone?: string;
}

interface Agent {
  id: string;
  user_id: string;
  company_id?: string;
  status: string;
  created_at: string;
  user?: User;
  company?: {
    name: string;
    slug: string;
  };
}

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: string;
  created_at: string;
  user?: User;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalAgents: 0,
    pendingAgents: 0,
    totalProperties: 0,
    totalRevenue: 0,
    activeListings: 0,
    newUsersThisMonth: 0,
    revenueThisMonth: 0,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [pendingAgents, setPendingAgents] = useState<Agent[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'agents' | 'revenue' | 'activity'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.push('/customer/dashboard');
        return;
      }

      await loadDashboardData();
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.push('/login');
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Load stats
      const [usersResult, agentsResult, propertiesResult] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact' }),
        supabase.from('agents').select('*', { count: 'exact' }),
        supabase.from('properties').select('*', { count: 'exact' }),
      ]);

      const totalUsers = usersResult.count || 0;
      const totalAgents = agentsResult.count || 0;
      const totalProperties = propertiesResult.count || 0;

      // Count pending agents
      const { count: pendingCount } = await supabase
        .from('agents')
        .select('*', { count: 'exact' })
        .eq('status', 'pending');

      // Count active listings
      const { count: activeCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact' })
        .eq('status', 'active');

      // Count new users this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: newUsersCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact' })
        .gte('created_at', startOfMonth.toISOString());

      setStats({
        totalUsers,
        totalAgents,
        pendingAgents: pendingCount || 0,
        totalProperties,
        totalRevenue: 0, // TODO: Calculate from transactions
        activeListings: activeCount || 0,
        newUsersThisMonth: newUsersCount || 0,
        revenueThisMonth: 0, // TODO: Calculate from transactions
      });

      // Load users
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      setUsers(usersData || []);

      // Load pending agents
      const { data: pendingAgentsData } = await supabase
        .from('agents')
        .select(`
          *,
          user:user_profiles(*),
          company:companies(name, slug)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setPendingAgents(pendingAgentsData || []);

      // Load recent activity (simulated for now)
      // TODO: Implement actual activity logging system
      setActivityLogs([]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveAgent = async (agentId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('agents')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', agentId);

      if (error) throw error;

      // Reload data
      await loadDashboardData();
      
      alert('Agent approved successfully!');
    } catch (error) {
      console.error('Error approving agent:', error);
      alert('Failed to approve agent');
    }
  };

  const rejectAgent = async (agentId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('agents')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', agentId);

      if (error) throw error;

      // Reload data
      await loadDashboardData();
      
      alert('Agent rejected');
    } catch (error) {
      console.error('Error rejecting agent:', error);
      alert('Failed to reject agent');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const supabase = createClient();
      
      // Delete user profile (cascade will handle related records)
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      // Reload data
      await loadDashboardData();
      
      alert('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      // Reload data
      await loadDashboardData();
      
      alert('User role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Platform management and analytics</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadDashboardData()}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={() => router.push('/admin/settings')}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'agents', label: 'Agent Approvals', icon: UserCheck },
              { id: 'revenue', label: 'Revenue', icon: DollarSign },
              { id: 'activity', label: 'Activity', icon: Activity },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-1 py-4 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'agents' && stats.pendingAgents > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {stats.pendingAgents}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
                    <p className="text-sm text-green-600 mt-2">+{stats.newUsersThisMonth} this month</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Agents</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalAgents}</p>
                    <p className="text-sm text-yellow-600 mt-2">{stats.pendingAgents} pending approval</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Listings</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeListings}</p>
                    <p className="text-sm text-gray-500 mt-2">of {stats.totalProperties} total</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <Home className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Revenue (MTD)</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">${stats.revenueThisMonth.toLocaleString()}</p>
                    <p className="text-sm text-gray-500 mt-2">Total: ${stats.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <DollarSign className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('agents')}
                  className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Review Agent Applications</p>
                    <p className="text-sm text-gray-600">{stats.pendingAgents} pending</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left"
                >
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Manage Users</p>
                    <p className="text-sm text-gray-600">{stats.totalUsers} total users</p>
                  </div>
                </button>

                <button
                  onClick={() => router.push('/admin/settings')}
                  className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                >
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Settings className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">System Settings</p>
                    <p className="text-sm text-gray-600">Configure platform</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="customer">Customers</option>
                  <option value="agent">Agents</option>
                  <option value="broker">Brokers</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium">
                                {user.first_name[0]}{user.last_name[0]}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value)}
                            className="text-sm px-3 py-1 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="customer">Customer</option>
                            <option value="agent">Agent</option>
                            <option value="broker">Broker</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.phone || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="text-red-600 hover:text-red-900 ml-3"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Agent Approvals Tab */}
        {activeTab === 'agents' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Pending Agent Applications</h2>
                <p className="text-sm text-gray-600 mt-1">Review and approve agent applications</p>
              </div>
              
              {pendingAgents.length === 0 ? (
                <div className="p-12 text-center">
                  <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No pending agent applications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {pendingAgents.map(agent => (
                    <div key={agent.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium text-lg">
                                {agent.user?.first_name?.[0]}{agent.user?.last_name?.[0]}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">
                                {agent.user?.first_name} {agent.user?.last_name}
                              </h3>
                              <p className="text-sm text-gray-600">{agent.user?.email}</p>
                            </div>
                          </div>
                          <div className="ml-15 space-y-1 text-sm text-gray-600">
                            <p className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Applied: {new Date(agent.created_at).toLocaleDateString()}
                            </p>
                            {agent.user?.phone && (
                              <p className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                {agent.user.phone}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => approveAgent(agent.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => rejectAgent(agent.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Revenue Tab */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Revenue Tracking</h3>
              <p className="text-gray-600">Revenue tracking and transaction management coming soon</p>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Activity Logs</h3>
              <p className="text-gray-600">Activity tracking and audit logs coming soon</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
