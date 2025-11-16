'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Calendar, Clock, Plus, Trash2, Save, Loader2 } from 'lucide-react';

interface TimeSlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AvailabilitySettings({ agentId }: { agentId: string }) {
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchAvailability();
  }, [agentId]);

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_availability')
        .select('*')
        .eq('agent_id', agentId)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = (dayOfWeek: number) => {
    const newSlot: TimeSlot = {
      day_of_week: dayOfWeek,
      start_time: '09:00',
      end_time: '17:00',
      is_available: true
    };
    setAvailability([...availability, newSlot]);
  };

  const removeTimeSlot = async (index: number, slotId?: string) => {
    if (slotId) {
      try {
        const { error } = await supabase
          .from('agent_availability')
          .delete()
          .eq('id', slotId);
        if (error) throw error;
      } catch (error) {
        console.error('Error deleting slot:', error);
        return;
      }
    }
    const newAvailability = [...availability];
    newAvailability.splice(index, 1);
    setAvailability(newAvailability);
  };

  const updateTimeSlot = (index: number, field: string, value: any) => {
    const newAvailability = [...availability];
    newAvailability[index] = { ...newAvailability[index], [field]: value };
    setAvailability(newAvailability);
  };

  const saveAvailability = async () => {
    setSaving(true);
    setMessage('');
    try {
      await supabase.from('agent_availability').delete().eq('agent_id', agentId);
      const slotsToInsert = availability.map(slot => ({
        agent_id: agentId,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: slot.is_available
      }));
      const { error } = await supabase.from('agent_availability').insert(slotsToInsert);
      if (error) throw error;
      setMessage('Availability saved successfully!');
      setTimeout(() => setMessage(''), 3000);
      fetchAvailability();
    } catch (error: any) {
      console.error('Error saving availability:', error);
      setMessage('Error saving availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Weekly Availability</h2>
        </div>
        <button
          onClick={saveAvailability}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><Save className="h-4 w-4" />Save Changes</>}
        </button>
      </div>
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.includes('Error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          {message}
        </div>
      )}
      <div className="space-y-6">
        {DAYS.map((day, dayIndex) => {
          const daySlots = availability.filter(slot => slot.day_of_week === dayIndex);
          return (
            <div key={dayIndex} className="border-b border-gray-200 pb-4 last:border-b-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{day}</h3>
                <button onClick={() => addTimeSlot(dayIndex)} className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">
                  <Plus className="h-4 w-4" />Add Time Slot
                </button>
              </div>
              {daySlots.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No availability set</p>
              ) : (
                <div className="space-y-2">
                  {daySlots.map((slot, slotIndex) => {
                    const globalIndex = availability.findIndex(s => s.day_of_week === dayIndex && s.start_time === slot.start_time && s.end_time === slot.end_time);
                    return (
                      <div key={slotIndex} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <input type="time" value={slot.start_time} onChange={(e) => updateTimeSlot(globalIndex, 'start_time', e.target.value)} className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        <span className="text-gray-500">to</span>
                        <input type="time" value={slot.end_time} onChange={(e) => updateTimeSlot(globalIndex, 'end_time', e.target.value)} className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={slot.is_available} onChange={(e) => updateTimeSlot(globalIndex, 'is_available', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                          <span className="text-sm text-gray-700">Available</span>
                        </label>
                        <button onClick={() => removeTimeSlot(globalIndex, slot.id)} className="ml-auto p-1 text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800"><strong>Tip:</strong> Set your weekly availability to help customers book appointments when you're available. You can add multiple time slots per day.</p>
      </div>
    </div>
  );
}
