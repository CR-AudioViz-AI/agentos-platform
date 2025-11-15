'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, MapPin, Home, Bed, Bath, Maximize, DollarSign, Star, ArrowRight, Filter, X } from 'lucide-react';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Property {
  id: string;
  category: string;
  address_line1: string;
  city: string;
  state: string;
  zip_code: string;
  list_price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
}

export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchLocation, setSearchLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceMax, setPriceMax] = useState(5000000);
  const [loading, setLoading] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const cities = ['Miami', 'Tampa', 'Orlando', 'Jacksonville', 'Fort Myers', 'Naples', 'Sarasota', 'Tallahassee'];

  useEffect(() => {
    loadProperties();
  }, [selectedCategory, priceMax]);

  async function loadProperties() {
    try {
      let query = supabase
        .from('properties')
        .select('*')
        .eq('visible_on_homefinder', true)
        .eq('status', 'active')
        .lte('list_price', priceMax)
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data } = await query.limit(50);
      setProperties(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function submitLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      await supabase.from('homefinder_leads').insert({
        first_name: formData.get('firstName'),
        last_name: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        interested_property_id: selectedProperty?.id,
        status: 'new'
      });

      alert('Thank you! An agent will contact you shortly.');
      setShowContactForm(false);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  const filteredProperties = properties.filter(p =>
    searchLocation === '' ||
    p.city.toLowerCase().includes(searchLocation.toLowerCase()) ||
    p.address_line1.toLowerCase().includes(searchLocation.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="w-8 h-8" />
            <span className="text-2xl font-bold">AgentOS</span>
          </div>
          <div className="flex gap-4">
            <Link href="/customer" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              Customer Login
            </Link>
            <Link href="/admin" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              Agent Login
            </Link>
          </div>
        </div>

        {/* Hero */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4">Find Your Perfect Property</h1>
            <p className="text-xl text-blue-100">Search properties across Florida</p>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="City, ZIP, or Address..."
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="all">All Types</option>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                  <option value="rental">Rental</option>
                  <option value="land">Land</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Price</label>
                <select
                  value={priceMax}
                  onChange={(e) => setPriceMax(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="500000">$500K</option>
                  <option value="1000000">$1M</option>
                  <option value="2000000">$2M</option>
                  <option value="5000000">$5M+</option>
                </select>
              </div>

              <div className="md:col-span-2 flex items-end">
                <button
                  onClick={() => loadProperties()}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Cities */}
      <div className="bg-gray-50 border-b py-6">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Popular Cities:</h3>
          <div className="flex flex-wrap gap-2">
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => setSearchLocation(city)}
                className="px-4 py-2 bg-white border rounded-lg hover:bg-blue-50 text-sm"
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Properties */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold mb-6">{filteredProperties.length} Properties Available</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <div key={property.id} className="bg-white rounded-lg shadow border overflow-hidden hover:shadow-lg">
                <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <Home className="w-16 h-16 text-blue-600 opacity-50" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-xl">${property.list_price.toLocaleString()}</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full capitalize">
                      {property.category.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{property.address_line1}</p>
                  <p className="text-sm text-gray-500 mb-3">{property.city}, {property.state}</p>

                  {property.bedrooms && (
                    <div className="flex gap-4 mb-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Bed className="w-4 h-4" />
                        <span>{property.bedrooms} bed</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bath className="w-4 h-4" />
                        <span>{property.bathrooms} bath</span>
                      </div>
                      {property.square_feet && (
                        <div className="flex items-center gap-1">
                          <Maximize className="w-4 h-4" />
                          <span>{property.square_feet.toLocaleString()} sqft</span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSelectedProperty(property);
                      setShowContactForm(true);
                    }}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  >
                    Contact Agent
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Contact Agent</h3>
              <button onClick={() => setShowContactForm(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name</label>
                  <input type="text" name="firstName" required className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name</label>
                  <input type="text" name="lastName" required className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" name="email" required className="w-full px-3 py-2 border rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input type="tel" name="phone" className="w-full px-3 py-2 border rounded-lg" />
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700">
                Submit Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
