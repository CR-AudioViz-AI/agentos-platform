'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, Home, Heart, FileText, MessageCircle, Bed, Bath } from 'lucide-react';
import Link from 'next/link';

export default function CustomerPortal() {
  const [activeTab, setActiveTab] = useState('search');
  const [properties, setProperties] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();

  useEffect(() => {
    loadProperties();
  }, []);

  async function loadProperties() {
    const { data } = await supabase
      .from('properties')
      .select('*')
      .eq('status', 'active')
      .limit(20);
    setProperties(data || []);
  }

  const filteredProps = properties.filter(p =>
    searchQuery === '' ||
    p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address_line1.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Home className="w-6 h-6 text-green-600" />
            <h1 className="text-2xl font-bold text-green-700">Customer Portal</h1>
          </div>
          <Link href="/" className="text-sm text-gray-600">← Back</Link>
        </div>
      </header>

      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-8">
            {['search', 'favorites', 'my-transactions', 'documents', 'messages'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500'
                }`}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'search' && (
          <>
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by address or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border rounded-lg"
                />
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-6">{filteredProps.length} Properties</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProps.map((property) => (
                <div key={property.id} className="bg-white rounded-lg shadow border overflow-hidden">
                  <div className="h-48 bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center relative">
                    <Home className="w-16 h-16 text-green-600 opacity-50" />
                    <button
                      onClick={() => setFavorites(prev =>
                        prev.includes(property.id) ? prev.filter(id => id !== property.id) : [...prev, property.id]
                      )}
                      className="absolute top-3 right-3 p-2 bg-white rounded-full shadow"
                    >
                      <Heart className={`w-5 h-5 ${favorites.includes(property.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-xl mb-2">${property.list_price.toLocaleString()}</h3>
                    <p className="text-sm text-gray-600 mb-1">{property.address_line1}</p>
                    <p className="text-sm text-gray-500 mb-3">{property.city}, {property.state}</p>
                    {property.bedrooms && (
                      <div className="flex gap-4 mb-4 text-sm">
                        <span>{property.bedrooms} bed</span>
                        <span>{property.bathrooms} bath</span>
                      </div>
                    )}
                    <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'favorites' && (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Your Favorites</h3>
            <p className="text-gray-600">{favorites.length} properties saved</p>
          </div>
        )}
      </div>
    </div>
  );
}
