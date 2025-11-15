'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { Search, MapPin, Bed, Bath, Square, DollarSign, Heart, Filter, Map, Grid3x3, ChevronDown } from 'lucide-react';

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  property_type: string;
  listing_type: string;
  images: string[];
  status: string;
  description: string;
}

export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: '',
    propertyType: 'all',
    listingType: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const supabase = createClientComponentClient();

  useEffect(() => {
    loadProperties();
  }, [filters]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('properties')
        .select('*')
        .eq('status', 'active')
        .eq('show_on_homefinder', true)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.minPrice) {
        query = query.gte('price', parseFloat(filters.minPrice));
      }
      if (filters.maxPrice) {
        query = query.lte('price', parseFloat(filters.maxPrice));
      }
      if (filters.bedrooms) {
        query = query.gte('bedrooms', parseInt(filters.bedrooms));
      }
      if (filters.bathrooms) {
        query = query.gte('bathrooms', parseFloat(filters.bathrooms));
      }
      if (filters.propertyType !== 'all') {
        query = query.eq('property_type', filters.propertyType);
      }
      if (filters.listingType !== 'all') {
        query = query.eq('listing_type', filters.listingType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading properties:', error);
      } else {
        setProperties(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (propertyId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(propertyId)) {
        newFavorites.delete(propertyId);
      } else {
        newFavorites.add(propertyId);
      }
      return newFavorites;
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                HomeFinder AI
              </Link>
              <nav className="hidden md:flex space-x-6">
                <Link href="/buy" className="text-gray-700 hover:text-blue-600 transition">
                  Buy
                </Link>
                <Link href="/rent" className="text-gray-700 hover:text-blue-600 transition">
                  Rent
                </Link>
                <Link href="/sell" className="text-gray-700 hover:text-blue-600 transition">
                  Sell
                </Link>
                <Link href="/agents" className="text-gray-700 hover:text-blue-600 transition">
                  Find Agents
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-700 hover:text-blue-600 transition">
                Sign In
              </button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Search Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Find Your Dream Home
            </h1>
            <p className="text-xl text-blue-100">
              Search thousands of properties across the nation
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-xl p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search by city, neighborhood, or ZIP code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  <Filter size={20} />
                  Filters
                  <ChevronDown size={16} className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
                <button
                  onClick={loadProperties}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  Search
                </button>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Price
                      </label>
                      <input
                        type="number"
                        placeholder="No min"
                        value={filters.minPrice}
                        onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                        className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Price
                      </label>
                      <input
                        type="number"
                        placeholder="No max"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                        className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bedrooms
                      </label>
                      <select
                        value={filters.bedrooms}
                        onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}
                        className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Any</option>
                        <option value="1">1+</option>
                        <option value="2">2+</option>
                        <option value="3">3+</option>
                        <option value="4">4+</option>
                        <option value="5">5+</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bathrooms
                      </label>
                      <select
                        value={filters.bathrooms}
                        onChange={(e) => setFilters({ ...filters, bathrooms: e.target.value })}
                        className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Any</option>
                        <option value="1">1+</option>
                        <option value="2">2+</option>
                        <option value="3">3+</option>
                        <option value="4">4+</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Property Type
                      </label>
                      <select
                        value={filters.propertyType}
                        onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
                        className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Types</option>
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                        <option value="land">Land</option>
                        <option value="rental">Rental</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Listing Type
                      </label>
                      <select
                        value={filters.listingType}
                        onChange={(e) => setFilters({ ...filters, listingType: e.target.value })}
                        className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All</option>
                        <option value="sale">For Sale</option>
                        <option value="rent">For Rent</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {loading ? 'Loading...' : `${properties.length} Properties Found`}
            </h2>
            <p className="text-gray-600 mt-1">
              Showing available listings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Grid3x3 size={20} />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 rounded-lg transition ${
                viewMode === 'map'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Map size={20} />
            </button>
          </div>
        </div>

        {/* Property Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                <div className="w-full h-48 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No properties found matching your criteria.</p>
            <button
              onClick={() => {
                setFilters({
                  minPrice: '',
                  maxPrice: '',
                  bedrooms: '',
                  bathrooms: '',
                  propertyType: 'all',
                  listingType: 'all'
                });
                setSearchQuery('');
              }}
              className="mt-4 text-blue-600 hover:text-blue-700 font-semibold"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <div
                key={property.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition group"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={property.images?.[0] || '/api/placeholder/400/300'}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <button
                    onClick={() => toggleFavorite(property.id)}
                    className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition"
                  >
                    <Heart
                      size={20}
                      className={favorites.has(property.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}
                    />
                  </button>
                  <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    For {property.listing_type === 'sale' ? 'Sale' : 'Rent'}
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {formatPrice(property.price)}
                      {property.listing_type === 'rent' && (
                        <span className="text-sm font-normal text-gray-600">/mo</span>
                      )}
                    </h3>
                  </div>

                  <p className="text-gray-600 mb-3 flex items-center gap-1">
                    <MapPin size={16} />
                    {property.address}, {property.city}, {property.state}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-700 mb-3">
                    <div className="flex items-center gap-1">
                      <Bed size={16} />
                      <span>{property.bedrooms} beds</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath size={16} />
                      <span>{property.bathrooms} baths</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Square size={16} />
                      <span>{property.square_feet?.toLocaleString()} sqft</span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {property.description}
                  </p>

                  <Link
                    href={`/properties/${property.id}`}
                    className="block w-full text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white py-16 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Find Your Perfect Property?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Connect with top real estate agents in your area
          </p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-gray-100 transition font-semibold text-lg">
            Get Started Today
          </button>
        </div>
      </div>
    </div>
  );
}
