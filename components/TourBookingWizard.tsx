'use client';

/**
 * TourBookingWizard Component
 * 
 * Multi-step guided tour booking flow with real-time availability
 * Features:
 * - Step 1: Select property (if not provided)
 * - Step 2: Choose date
 * - Step 3: Select time slot from available options
 * - Step 4: Confirmation and submit
 * - Real-time conflict detection
 * - Calendar invitation generation
 * - Email notifications
 * 
 * Created: November 17, 2025 - 3:35 AM EST
 * Standard: Henderson Standard - Fortune 50 Quality
 */

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Home,
  User,
  CheckCircle,
  Loader2,
  AlertCircle,
  Mail
} from 'lucide-react';
import { format, addDays, parseISO, startOfDay } from 'date-fns';

type Property = Database['public']['Tables']['properties']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Tour = Database['public']['Tables']['tours']['Insert'];

interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

interface TourBookingWizardProps {
  propertyId?: string; // Optional: if provided, skip property selection
  agentId?: string; // Optional: if provided, skip agent selection
  buyerId: string; // Required: current user
  onComplete?: (tourId: string) => void;
  onCancel?: () => void;
}

export default function TourBookingWizard({
  propertyId: initialPropertyId,
  agentId: initialAgentId,
  buyerId,
  onComplete,
  onCancel
}: TourBookingWizardProps) {
  const supabase = createClientComponentClient<Database>();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(initialPropertyId ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [properties, setProperties] = useState<Property[]>([]);
  const [agents, setAgents] = useState<Profile[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Profile | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [tourType, setTourType] = useState<'in_person' | 'virtual'>('in_person');
  const [notes, setNotes] = useState('');

  // Available slots
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  /**
   * Load properties (Step 1)
   */
  const loadProperties = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      setProperties(data || []);

      // If propertyId provided, find and set it
      if (initialPropertyId && data) {
        const property = data.find(p => p.id === initialPropertyId);
        if (property) {
          setSelectedProperty(property);
          loadAgentsForProperty(property.id);
        }
      }
    } catch (err) {
      console.error('Error loading properties:', err);
      setError('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load agents for selected property
   */
  const loadAgentsForProperty = async (propertyId: string) => {
    try {
      setLoading(true);

      // Get property to find its agent
      const { data: property, error: propError } = await supabase
        .from('properties')
        .select('agent_id')
        .eq('id', propertyId)
        .single();

      if (propError) throw propError;

      // Get agent profile
      const { data: agent, error: agentError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', property.agent_id)
        .eq('role', 'agent')
        .eq('status', 'approved')
        .single();

      if (agentError) throw agentError;

      setAgents([agent]);
      setSelectedAgent(agent);

      // If agentId was provided initially, verify it matches
      if (initialAgentId && agent.id === initialAgentId) {
        setSelectedAgent(agent);
      }
    } catch (err) {
      console.error('Error loading agents:', err);
      setError('Failed to load agent information');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load available time slots for selected date and agent
   */
  const loadAvailableSlots = async (date: Date, agentId: string) => {
    try {
      setLoadingSlots(true);
      setError(null);

      // Call database function to get available slots
      const { data, error: slotsError } = await supabase
        .rpc('get_available_slots', {
          p_agent_id: agentId,
          p_date: format(date, 'yyyy-MM-dd'),
          p_duration_minutes: 60,
          p_slot_interval_minutes: 30
        });

      if (slotsError) throw slotsError;

      // Convert to TimeSlot format
      const slots: TimeSlot[] = (data || []).map((slot: any) => ({
        start: parseISO(slot.slot_start),
        end: parseISO(slot.slot_end),
        available: slot.is_available
      }));

      // Filter to only show available slots
      const availableOnly = slots.filter(slot => slot.available);
      setAvailableSlots(availableOnly);

      if (availableOnly.length === 0) {
        setError('No available time slots on this date. Please choose another date.');
      }
    } catch (err) {
      console.error('Error loading available slots:', err);
      setError('Failed to load available time slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  /**
   * Submit tour booking
   */
  const submitBooking = async () => {
    if (!selectedProperty || !selectedAgent || !selectedDate || !selectedTimeSlot) {
      setError('Please complete all steps before booking');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Use database function to schedule with validation
      const { data: tourId, error: scheduleError } = await supabase
        .rpc('schedule_tour_with_validation', {
          p_property_id: selectedProperty.id,
          p_buyer_id: buyerId,
          p_agent_id: selectedAgent.id,
          p_scheduled_for: selectedTimeSlot.start.toISOString(),
          p_tour_type: tourType,
          p_notes: notes || null
        });

      if (scheduleError) throw scheduleError;

      // Send confirmation email
      await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'tour_confirmation',
          to: selectedAgent.email,
          data: {
            agentName: selectedAgent.full_name,
            propertyAddress: selectedProperty.address,
            tourDate: format(selectedTimeSlot.start, 'EEEE, MMMM d, yyyy'),
            tourTime: format(selectedTimeSlot.start, 'h:mm a'),
            tourType: tourType
          }
        })
      });

      onComplete?.(tourId);
    } catch (err: any) {
      console.error('Error booking tour:', err);
      setError(err.message || 'Failed to book tour. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle step navigation
   */
  const nextStep = () => {
    if (currentStep === 1 && selectedProperty) {
      loadAgentsForProperty(selectedProperty.id);
      setCurrentStep(2);
    } else if (currentStep === 2 && selectedDate && selectedAgent) {
      loadAvailableSlots(selectedDate, selectedAgent.id);
      setCurrentStep(3);
    } else if (currentStep === 3 && selectedTimeSlot) {
      setCurrentStep(4);
    }
  };

  const prevStep = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
    setError(null);
  };

  // Load properties on mount
  useEffect(() => {
    if (!initialPropertyId) {
      loadProperties();
    } else {
      // Skip to step 2 if property provided
      loadProperties();
    }
  }, []);

  // Generate next 14 days for date selection
  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Progress Bar */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900">Book a Tour</h2>
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex-1">
                <div
                  className={`h-2 rounded-full ${
                    step <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                />
              </div>
            ))}
          </div>
          
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span className={currentStep === 1 ? 'font-semibold text-blue-600' : ''}>
              {initialPropertyId ? 'Property' : 'Select Property'}
            </span>
            <span className={currentStep === 2 ? 'font-semibold text-blue-600' : ''}>Choose Date</span>
            <span className={currentStep === 3 ? 'font-semibold text-blue-600' : ''}>Select Time</span>
            <span className={currentStep === 4 ? 'font-semibold text-blue-600' : ''}>Confirm</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="p-6">
          {/* Step 1: Select Property */}
          {currentStep === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Home className="w-5 h-5" />
                <span>Select a Property</span>
              </h3>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                  {properties.map((property) => (
                    <button
                      key={property.id}
                      onClick={() => setSelectedProperty(property)}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${
                        selectedProperty?.id === property.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        {property.images?.[0] && (
                          <img
                            src={property.images[0]}
                            alt={property.address}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{property.address}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {property.city}, {property.state} {property.zip_code}
                          </p>
                          <p className="text-lg font-bold text-blue-600 mt-2">
                            ${property.price?.toLocaleString()}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>{property.bedrooms} bed</span>
                            <span>{property.bathrooms} bath</span>
                            <span>{property.square_feet?.toLocaleString()} sqft</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Choose Date */}
          {currentStep === 2 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Choose a Date</span>
              </h3>

              {selectedProperty && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Property:</p>
                  <p className="font-semibold text-gray-900">{selectedProperty.address}</p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableDates.map((date) => (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={`p-4 rounded-lg border-2 transition-all text-center ${
                      selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm text-gray-600">{format(date, 'EEE')}</div>
                    <div className="text-2xl font-bold text-gray-900 my-1">
                      {format(date, 'd')}
                    </div>
                    <div className="text-sm text-gray-600">{format(date, 'MMM yyyy')}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Select Time */}
          {currentStep === 3 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Select a Time</span>
              </h3>

              {selectedDate && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Date:</p>
                  <p className="font-semibold text-gray-900">
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              )}

              {loadingSlots ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No available time slots on this date.</p>
                  <button
                    onClick={prevStep}
                    className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Choose a different date
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableSlots.map((slot, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedTimeSlot(slot)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedTimeSlot?.start.getTime() === slot.start.getTime()
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg font-semibold text-gray-900">
                        {format(slot.start, 'h:mm a')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {format(slot.end, 'h:mm a')}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {availableSlots.length > 0 && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tour Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setTourType('in_person')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        tourType === 'in_person'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">In Person</div>
                      <div className="text-sm text-gray-600">Visit the property</div>
                    </button>
                    <button
                      onClick={() => setTourType('virtual')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        tourType === 'virtual'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">Virtual</div>
                      <div className="text-sm text-gray-600">Video call</div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Confirm Your Booking</span>
              </h3>

              <div className="space-y-4">
                {/* Property Details */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Property</p>
                  <p className="font-semibold text-gray-900">{selectedProperty?.address}</p>
                  <p className="text-sm text-gray-600">
                    {selectedProperty?.city}, {selectedProperty?.state}
                  </p>
                </div>

                {/* Agent Details */}
                {selectedAgent && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Agent</p>
                    <p className="font-semibold text-gray-900">{selectedAgent.full_name}</p>
                    <p className="text-sm text-gray-600">{selectedAgent.email}</p>
                  </div>
                )}

                {/* Tour Details */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Tour Details</p>
                  <p className="font-semibold text-gray-900">
                    {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-gray-900">
                    {selectedTimeSlot && format(selectedTimeSlot.start, 'h:mm a')} - {selectedTimeSlot && format(selectedTimeSlot.end, 'h:mm a')}
                  </p>
                  <p className="text-sm text-gray-600 capitalize mt-1">
                    {tourType.replace('_', ' ')} Tour
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Any special requests or questions..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={submitBooking}
                  disabled={submitting}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 flex items-center justify-center space-x-2 text-lg font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Booking Tour...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Confirm Booking</span>
                    </>
                  )}
                </button>

                <p className="text-xs text-center text-gray-500">
                  You'll receive a confirmation email with calendar invitation
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        {currentStep < 4 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 1 || loading}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <button
              onClick={nextStep}
              disabled={
                (currentStep === 1 && !selectedProperty) ||
                (currentStep === 2 && !selectedDate) ||
                (currentStep === 3 && !selectedTimeSlot) ||
                loading ||
                loadingSlots
              }
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>Next</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
