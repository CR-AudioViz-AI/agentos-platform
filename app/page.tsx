'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Search, MapPin, Bed, Bath, Square, DollarSign, Heart, Filter, Map, Grid, ChevronDown } from 'lucide-react';

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
  property_type: string;
  status: string;
  property_images: { url: string; is_primary: boolean }[];
}

export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    propertyType: ''
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const supabase = createClient();
      let query = supabase
        .from('properties')
        .select(`
          *,
          property_images (url, is_primary)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  const getPrimaryImage = (images: any[]) => {
    if (!images || images.length === 0) return '/placeholder-property.jpg';
    const primary = images.find(img => img.is_primary);
    return primary?.url || images[0]?.url || '/placeholder-property.jpg';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
            Find Your Dream Home
          </h1>
          <p className="text-xl text-center mb-8 text-blue-100">
            Discover the perfect property from our curated listings
          </p>

          {/* Search Bar */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by city, neighborhood, or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="h-4 w-4" />
              Filters
            </button>
            <p className="text-gray-600">{properties.length} properties found</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <Map className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Property Grid */}
        <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="relative h-64">
                <img
                  src={getPrimaryImage(property.property_images)}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
                <button className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors">
                  <Heart className="h-5 w-5 text-gray-600" />
                </button>
                <div className="absolute bottom-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  {property.property_type}
                </div>
              </div>

              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{formatPrice(property.price)}</h3>
                </div>

                <p className="text-gray-600 mb-2 flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {property.address}, {property.city}, {property.state}
                </p>

                <div className="flex items-center gap-4 text-gray-600">
                  {property.bedrooms && (
                    <div className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      <span className="text-sm">{property.bedrooms} bed</span>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      <span className="text-sm">{property.bathrooms} bath</span>
                    </div>
                  )}
                  {property.square_feet && (
                    <div className="flex items-center gap-1">
                      <Square className="h-4 w-4" />
                      <span className="text-sm">{property.square_feet.toLocaleString()} sqft</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {properties.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg mb-4">No properties found</p>
            <p className="text-gray-500">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
