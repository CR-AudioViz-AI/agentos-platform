'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, Home, CheckCircle } from 'lucide-react';

interface TourBookingWizardProps {
  propertyId: string;
  agentId: string;
  onComplete?: () => void;
}

export default function TourBookingWizard({ propertyId, agentId, onComplete }: TourBookingWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    preferred_date: '',
    preferred_time: '',
    alternate_date_1: '',
    alternate_date_2: '',
    message: '',
    name: '',
    email: '',
    phone: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase.from('tour_requests').insert({
        property_id: propertyId,
        customer_id: user.id,
        agent_id: agentId,
        preferred_date: formData.preferred_date,
        preferred_time: formData.preferred_time,
        alternate_dates: [formData.alternate_date_1, formData.alternate_date_2].filter(Boolean),
        message: formData.message
      });

      if (error) throw error;
      setStep(4);
      onComplete?.();
    } catch (error) {
      console.error('Error booking tour:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex-1 h-2 rounded ${step >= s ? 'bg-blue-600' : 'bg-gray-200'} ${s > 1 ? 'ml-2' : ''}`} />
          ))}
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Date & Time</span>
          <span>Contact Info</span>
          <span>Confirm</span>
        </div>
      </div>

      {/* Step 1: Date & Time */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Select Date & Time
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
            <input type="date" value={formData.preferred_date} onChange={e => setFormData({...formData, preferred_date: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time</label>
            <input type="time" value={formData.preferred_time} onChange={e => setFormData({...formData, preferred_time: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Date 1 (Optional)</label>
            <input type="date" value={formData.alternate_date_1} onChange={e => setFormData({...formData, alternate_date_1: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Date 2 (Optional)</label>
            <input type="date" value={formData.alternate_date_2} onChange={e => setFormData({...formData, alternate_date_2: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      )}

      {/* Step 2: Contact Info */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <User className="h-6 w-6 text-blue-600" />
            Your Information
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
            <textarea value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Any special requests or questions..." />
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-blue-600" />
            Confirm Booking
          </h2>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div><strong>Date:</strong> {new Date(formData.preferred_date).toLocaleDateString()}</div>
            <div><strong>Time:</strong> {formData.preferred_time}</div>
            <div><strong>Name:</strong> {formData.name}</div>
            <div><strong>Email:</strong> {formData.email}</div>
            <div><strong>Phone:</strong> {formData.phone}</div>
            {formData.message && <div><strong>Message:</strong> {formData.message}</div>}
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <div className="text-center py-8">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Tour Request Sent!</h2>
          <p className="text-gray-600">The agent will contact you shortly to confirm your tour.</p>
        </div>
      )}

      {/* Navigation */}
      {step < 4 && (
        <div className="flex justify-between mt-6">
          <button onClick={prevStep} disabled={step === 1} className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 flex items-center gap-2">
            <ChevronLeft className="h-5 w-5" />Back
          </button>
          {step < 3 ? (
            <button onClick={nextStep} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              Next<ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {submitting ? 'Booking...' : 'Book Tour'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
