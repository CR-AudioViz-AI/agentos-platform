'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, Bed, Bath, Square, DollarSign, Heart, Share2, Phone, Mail,
  Calendar, ArrowLeft, Home, Building2, Car, TreePine, Waves, Star,
  Calculator, MessageSquare, X, ChevronLeft, ChevronRight
} from 'lucide-react';

interface Property {
  id: string;
  title: string;
  address: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  lot_size?: number;
  year_built?: number;
  property_type: string;
  listing_type: string;
  description: string;
  features?: string[];
  amenities?: string[];
  images: string[];
  virtual_tour_url?: string;
  mls_number?: string;
  hoa_fees?: number;
  property_taxes?: number;
  listing_agent_id?: string;
  company_id: string;
  created_at: string;
}

interface Agent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  license_number?: string;
}

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Calculator state
  const [loanAmount, setLoanAmount] = useState(0);
  const [interestRate, setInterestRate] = useState(7.0);
  const [loanTerm, setLoanTerm] = useState(30);
  const [downPayment, setDownPayment] = useState(20);

  // Contact form state
  interface ContactForm {
    name: string;
    email: string;
    phone: string;
    message: string;
    preferredContact: string;
  }
  
  const [contactForm, setContactForm] = useState<ContactForm>({
    name: '',
    email: '',
    phone: '',
    message: 'I am interested in this property. Please contact me.',
    preferredContact: 'email'
  });

  const supabase = createClient();

  useEffect(() => {
    if (params.id) {
      loadProperty();
    }
  }, [params.id]);

  useEffect(() => {
    if (property) {
      setLoanAmount(property.price * (1 - downPayment / 100));
    }
  }, [property, downPayment]);

  const loadProperty = async () => {
    try {
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', params.id)
        .single();

      if (propertyError) throw propertyError;

      setProperty(propertyData);

      // Load agent info if available
      if (propertyData.listing_agent_id) {
        const { data: agentData } = await supabase
          .from('users')
          .select('*')
          .eq('id', propertyData.listing_agent_id)
          .single();

        if (agentData) {
          setAgent(agentData);
        }
      }
    } catch (error) {
      console.error('Error loading property:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyPayment = () => {
    const principal = loanAmount;
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;

    if (monthlyRate === 0) {
      return principal / numberOfPayments;
    }

    const monthlyPayment =
      principal *
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

    return monthlyPayment;
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Create lead in database
      const { error } = await supabase
        .from('leads')
        .insert({
          company_id: property?.company_id,
          first_name: contactForm.name.split(' ')[0],
          last_name: contactForm.name.split(' ').slice(1).join(' ') || '',
          email: contactForm.email,
          phone: contactForm.phone,
          source: 'homefinder',
          status: 'new',
          lead_type: 'buyer',
          interested_property_id: property?.id,
          notes: contactForm.message,
          assigned_agent_id: property?.listing_agent_id
        });

      if (error) throw error;

      alert('Thank you! An agent will contact you shortly.');
      setShowContactForm(false);
      setContactForm({
        name: '',
        email: '',
        phone: '',
        message: 'I am interested in this property. Please contact me.',
        preferredContact: 'email'
      });
    } catch (error) {
      console.error('Error submitting contact form:', error);
      alert('There was an error. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Property Not Found</h1>
          <p className="text-gray-600 mb-4">The property you're looking for doesn't exist.</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-semibold">
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const monthlyPayment = calculateMonthlyPayment();
  const totalMonthly = monthlyPayment + (property.hoa_fees || 0) + ((property.property_taxes || 0) / 12);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              HomeFinder AI
            </Link>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition"
              >
                <Heart size={20} className={isFavorite ? 'fill-red-500 text-red-500' : ''} />
                Save
              </button>
              <button className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition">
                <Share2 size={20} />
                Share
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft size={20} />
          Back to Search
        </button>
      </div>

      {/* Image Gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="relative h-96 md:h-[500px] rounded-lg overflow-hidden">
          <img
            src={property.images?.[currentImageIndex] || '/api/placeholder/800/500'}
            alt={property.title}
            className="w-full h-full object-cover"
          />
          {property.images && property.images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? property.images.length - 1 : prev - 1))}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-lg hover:bg-white transition"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={() => setCurrentImageIndex((prev) => (prev === property.images.length - 1 ? 0 : prev + 1))}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-lg hover:bg-white transition"
              >
                <ChevronRight size={24} />
              </button>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {property.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition ${
                      index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price & Basic Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {formatPrice(property.price)}
                    {property.listing_type === 'rent' && (
                      <span className="text-lg font-normal text-gray-600">/month</span>
                    )}
                  </h1>
                  <p className="text-gray-600 flex items-center gap-1">
                    <MapPin size={18} />
                    {property.address}
                    {property.unit && `, Unit ${property.unit}`}
                    <br />
                    {property.city}, {property.state} {property.zip}
                  </p>
                </div>
                <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold">
                  For {property.listing_type === 'sale' ? 'Sale' : 'Rent'}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="flex items-center gap-2">
                  <Bed size={20} className="text-gray-600" />
                  <div>
                    <div className="text-xl font-bold">{property.bedrooms}</div>
                    <div className="text-sm text-gray-600">Bedrooms</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Bath size={20} className="text-gray-600" />
                  <div>
                    <div className="text-xl font-bold">{property.bathrooms}</div>
                    <div className="text-sm text-gray-600">Bathrooms</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Square size={20} className="text-gray-600" />
                  <div>
                    <div className="text-xl font-bold">{property.square_feet?.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Sq Ft</div>
                  </div>
                </div>
                {property.lot_size && (
                  <div className="flex items-center gap-2">
                    <TreePine size={20} className="text-gray-600" />
                    <div>
                      <div className="text-xl font-bold">{property.lot_size?.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Lot Sq Ft</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Property</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </div>

            {/* Features */}
            {property.features && property.features.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Features & Amenities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {property.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Property Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Property Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-b border-gray-200 pb-2">
                  <div className="text-sm text-gray-600">Property Type</div>
                  <div className="text-gray-900 font-semibold capitalize">{property.property_type}</div>
                </div>
                {property.year_built && (
                  <div className="border-b border-gray-200 pb-2">
                    <div className="text-sm text-gray-600">Year Built</div>
                    <div className="text-gray-900 font-semibold">{property.year_built}</div>
                  </div>
                )}
                {property.hoa_fees && (
                  <div className="border-b border-gray-200 pb-2">
                    <div className="text-sm text-gray-600">HOA Fees</div>
                    <div className="text-gray-900 font-semibold">{formatPrice(property.hoa_fees)}/month</div>
                  </div>
                )}
                {property.property_taxes && (
                  <div className="border-b border-gray-200 pb-2">
                    <div className="text-sm text-gray-600">Property Taxes</div>
                    <div className="text-gray-900 font-semibold">{formatPrice(property.property_taxes)}/year</div>
                  </div>
                )}
                {property.mls_number && (
                  <div className="border-b border-gray-200 pb-2">
                    <div className="text-sm text-gray-600">MLS Number</div>
                    <div className="text-gray-900 font-semibold">{property.mls_number}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Agent Card */}
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              {agent ? (
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={agent.avatar_url || '/api/placeholder/60/60'}
                      alt={`${agent.first_name} ${agent.last_name}`}
                      className="w-16 h-16 rounded-full"
                    />
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {agent.first_name} {agent.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">Licensed Agent</p>
                      {agent.license_number && (
                        <p className="text-xs text-gray-500">Lic. #{agent.license_number}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => setShowContactForm(true)}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2"
                    >
                      <Mail size={20} />
                      Contact Agent
                    </button>
                    {agent.phone && (
                      <a
                        href={`tel:${agent.phone}`}
                        className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2"
                      >
                        <Phone size={20} />
                        {agent.phone}
                      </a>
                    )}
                    <button className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition font-semibold flex items-center justify-center gap-2">
                      <Calendar size={20} />
                      Schedule Tour
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-bold text-gray-900 mb-4">Interested in this property?</h3>
                  <button
                    onClick={() => setShowContactForm(true)}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2"
                  >
                    <Mail size={20} />
                    Contact Us
                  </button>
                </div>
              )}

              {/* Mortgage Calculator Button */}
              <button
                onClick={() => setShowCalculator(!showCalculator)}
                className="w-full mt-4 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition font-semibold flex items-center justify-center gap-2"
              >
                <Calculator size={20} />
                Mortgage Calculator
              </button>

              {/* Calculator */}
              {showCalculator && property.listing_type === 'sale' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-3">Monthly Payment Estimate</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Down Payment (%)</label>
                      <input
                        type="number"
                        value={downPayment}
                        onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Interest Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={interestRate}
                        onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Loan Term (years)</label>
                      <select
                        value={loanTerm}
                        onChange={(e) => setLoanTerm(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={15}>15 years</option>
                        <option value={30}>30 years</option>
                      </select>
                    </div>
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">Principal & Interest</span>
                        <span className="font-semibold">{formatPrice(monthlyPayment)}</span>
                      </div>
                      {property.hoa_fees && (
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-gray-600">HOA Fees</span>
                          <span className="font-semibold">{formatPrice(property.hoa_fees)}</span>
                        </div>
                      )}
                      {property.property_taxes && (
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-gray-600">Property Tax</span>
                          <span className="font-semibold">{formatPrice(property.property_taxes / 12)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-gray-200">
                        <span className="font-bold">Total Monthly</span>
                        <span className="text-xl font-bold text-blue-600">{formatPrice(totalMonthly)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-900">Contact Agent</h3>
              <button
                onClick={() => setShowContactForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
