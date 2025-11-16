'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Home, Heart, Calendar, MessageSquare, User, Settings, LogOut,
  Search, MapPin, Bed, Bath, Square, DollarSign, Eye, Trash2,
  Clock, CheckCircle, XCircle, AlertCircle, Bell, Filter
} from 'lucide-react';
import Link from 'next/link';

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  image_url?: string;
}

interface SavedProperty {
  id: string;
  property_id: string;
  created_at: string;
  property?: Property;
}

interface TourRequest {
  id: string;
  property_id: string;
  requested_date: string;
  requested_time: string;
  status: string;
  created_at: string;
  property?: Property;
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
}

export default function CustomerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'saved' | 'tours' | 'messages' | 'profile'>('overview');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [tourRequests, setTourRequests] = useState<TourRequest[]>([]);
  const [stats, setStats] = useState({
    savedCount: 0,
    toursScheduled: 0,
    toursPending: 0,
    messagesUnread: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      // Load user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setUserProfile(profile);

      // Load saved properties
      const { data: saved } = await supabase
        .from('saved_properties')
        .select(`
          *,
          property:properties(*)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      setSavedProperties(saved || []);

      // Load tour requests
      const { data: tours } = await supabase
        .from('tour_requests')
        .select(`
          *,
          property:properties(*)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      setTourRequests(tours || []);

      // Calculate stats
      const toursScheduled = tours?.filter(t => t.status === 'confirmed').length || 0;
      const toursPending = tours?.filter(t => t.status === 'pending').length || 0;

      setStats({
        savedCount: saved?.length || 0,
        toursScheduled,
        toursPending,
        messagesUnread: 0, // TODO: Implement messages
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeSavedProperty = async (savedPropertyId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('saved_properties')
        .delete()
        .eq('id', savedPropertyId);

      if (error) throw error;

      await loadDashboard();
    } catch (error) {
      console.error('Error removing saved property:', error);
      alert('Failed to remove property');
    }
  };

  const cancelTour = async (tourId: string) => {
    if (!confirm('Are you sure you want to cancel this tour request?')) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('tour_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', tourId);

      if (error) throw error;

      await loadDashboard();
    } catch (error) {
      console.error('Error cancelling tour:', error);
      alert('Failed to cancel tour');
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {userProfile?.first_name}!
              </h1>
              <p className="text-sm text-gray-600 mt-1">Manage your property search and tours</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Search className="w-4 h-4" />
                Search Properties
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
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
              { id: 'overview', label: 'Overview', icon: Home },
              { id: 'saved', label: 'Saved Properties', icon: Heart, badge: stats.savedCount },
              { id: 'tours', label: 'Tour Requests', icon: Calendar, badge: stats.toursPending },
              { id: 'messages', label: 'Messages', icon: MessageSquare, badge: stats.messagesUnread },
              { id: 'profile', label: 'Profile', icon: User },
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
                {tab.badge ? (
                  <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                ) : null}
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
                    <p className="text-sm text-gray-600">Saved Properties</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.savedCount}</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <Heart className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tours Scheduled</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.toursScheduled}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending Tours</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.toursPending}</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Unread Messages</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.messagesUnread}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              
              {savedProperties.length === 0 && tourRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No activity yet</p>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    Start Searching Properties
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {tourRequests.slice(0, 3).map(tour => (
                    <div key={tour.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Tour Request</p>
                        <p className="text-sm text-gray-600">{tour.property?.title || 'Property'}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(tour.requested_date).toLocaleDateString()} at {tour.requested_time}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-sm rounded-full ${
                        tour.status === 'confirmed' 
                          ? 'bg-green-100 text-green-700'
                          : tour.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {tour.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Saved Properties Tab */}
        {activeTab === 'saved' && (
          <div className="space-y-6">
            {savedProperties.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Saved Properties</h3>
                <p className="text-gray-600 mb-6">Start saving properties you're interested in</p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Search className="w-5 h-5" />
                  Browse Properties
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedProperties.map(saved => {
                  const property = saved.property;
                  if (!property) return null;

                  return (
                    <div key={saved.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="relative h-48 bg-gray-200">
                        {property.image_url ? (
                          <img
                            src={property.image_url}
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                        <button
                          onClick={() => removeSavedProperty(saved.id)}
                          className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors"
                        >
                          <Heart className="w-5 h-5 text-red-600 fill-current" />
                        </button>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{property.title}</h3>
                        <p className="text-sm text-gray-600 mb-3 flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {property.city}, {property.state}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            <Bed className="w-4 h-4" />
                            {property.bedrooms}
                          </span>
                          <span className="flex items-center gap-1">
                            <Bath className="w-4 h-4" />
                            {property.bathrooms}
                          </span>
                          <span className="flex items-center gap-1">
                            <Square className="w-4 h-4" />
                            {property.square_feet?.toLocaleString()} ft²
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600 mb-3">
                          ${property.price?.toLocaleString()}
                        </p>
                        <Link
                          href={`/properties/${property.id}`}
                          className="block text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tour Requests Tab */}
        {activeTab === 'tours' && (
          <div className="space-y-6">
            {tourRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Tour Requests</h3>
                <p className="text-gray-600">Schedule tours to visit properties in person</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {tourRequests.map(tour => {
                    const property = tour.property;
                    if (!property) return null;

                    return (
                      <div key={tour.id} className="p-6 hover:bg-gray-50">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-32 h-24 bg-gray-200 rounded-lg overflow-hidden">
                            {property.image_url ? (
                              <img
                                src={property.image_url}
                                alt={property.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Home className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{property.title}</h3>
                                <p className="text-sm text-gray-600">{property.address}, {property.city}, {property.state}</p>
                              </div>
                              <span className={`px-3 py-1 text-sm rounded-full ${
                                tour.status === 'confirmed' 
                                  ? 'bg-green-100 text-green-700'
                                  : tour.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : tour.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {tour.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                              <span className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {new Date(tour.requested_date).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {tour.requested_time}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Link
                                href={`/properties/${property.id}`}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                View Property
                              </Link>
                              {tour.status === 'pending' && (
                                <button
                                  onClick={() => cancelTour(tour.id)}
                                  className="px-4 py-2 text-sm text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                  Cancel Request
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Messaging System</h3>
            <p className="text-gray-600">Chat with agents and property owners (coming soon)</p>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={userProfile?.first_name || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={userProfile?.last_name || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={userProfile?.email || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={userProfile?.phone || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Profile editing will be available soon. Contact support to update your information.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
