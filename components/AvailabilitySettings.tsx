'use client';

/**
 * AvailabilitySettings Component
 * 
 * Allows agents to manage their availability schedules
 * Features:
 * - Set recurring weekly hours
 * - Add one-time availability blocks
 * - Set blackout dates (vacations)
 * - Configure buffer times
 * - Visual schedule preview
 * - Real-time updates
 * 
 * Created: November 17, 2025 - 3:25 AM EST
 * Standard: Henderson Standard - Fortune 50 Quality
 */

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import { 
  Calendar,
  Clock,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { format, addDays } from 'date-fns';

type AgentAvailability = Database['public']['Tables']['agent_availability']['Row'];
type AgentAvailabilityInsert = Database['public']['Tables']['agent_availability']['Insert'];

interface RecurringSchedule {
  day: number; // 0=Sunday, 6=Saturday
  startTime: string;
  endTime: string;
  title: string;
}

interface OneTimeBlock {
  startDateTime: string;
  endDateTime: string;
  title: string;
}

interface BlackoutDate {
  startDateTime: string;
  endDateTime: string;
  title: string;
}

interface AvailabilitySettingsProps {
  agentId: string;
  onSaveSuccess?: () => void;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export default function AvailabilitySettings({
  agentId,
  onSaveSuccess
}: AvailabilitySettingsProps) {
  const supabase = createClientComponentClient<Database>();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Schedule states
  const [recurringSchedule, setRecurringSchedule] = useState<RecurringSchedule[]>([]);
  const [oneTimeBlocks, setOneTimeBlocks] = useState<OneTimeBlock[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);
  const [bufferBefore, setBufferBefore] = useState(15);
  const [bufferAfter, setBufferAfter] = useState(15);
  
  // UI states
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [showAddOneTime, setShowAddOneTime] = useState(false);
  const [showAddBlackout, setShowAddBlackout] = useState(false);
  
  // New entry forms
  const [newRecurring, setNewRecurring] = useState<RecurringSchedule>({
    day: 1,
    startTime: '09:00',
    endTime: '17:00',
    title: 'Office Hours'
  });
  const [newOneTime, setNewOneTime] = useState<OneTimeBlock>({
    startDateTime: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
    endDateTime: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
    title: 'Special Availability'
  });
  const [newBlackout, setNewBlackout] = useState<BlackoutDate>({
    startDateTime: format(addDays(new Date(), 1), "yyyy-MM-dd'T'09:00"),
    endDateTime: format(addDays(new Date(), 7), "yyyy-MM-dd'T'17:00"),
    title: 'Vacation'
  });

  /**
   * Load existing availability settings
   */
  const loadAvailability = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('agent_availability')
        .select('*')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      // Separate by type
      const recurring: RecurringSchedule[] = [];
      const oneTime: OneTimeBlock[] = [];
      const blackout: BlackoutDate[] = [];
      let bufferBeforeVal = 15;
      let bufferAfterVal = 15;

      data?.forEach(item => {
        if (item.availability_type === 'recurring' && item.day_of_week !== null) {
          recurring.push({
            day: item.day_of_week,
            startTime: item.start_time || '09:00',
            endTime: item.end_time || '17:00',
            title: item.title || 'Office Hours'
          });
          bufferBeforeVal = item.buffer_before || 15;
          bufferAfterVal = item.buffer_after || 15;
        } else if (item.availability_type === 'one_time') {
          oneTime.push({
            startDateTime: item.start_datetime || '',
            endDateTime: item.end_datetime || '',
            title: item.title || 'Special Availability'
          });
        } else if (item.availability_type === 'blackout') {
          blackout.push({
            startDateTime: item.start_datetime || '',
            endDateTime: item.end_datetime || '',
            title: item.title || 'Blackout'
          });
        }
      });

      setRecurringSchedule(recurring);
      setOneTimeBlocks(oneTime);
      setBlackoutDates(blackout);
      setBufferBefore(bufferBeforeVal);
      setBufferAfter(bufferAfterVal);

    } catch (err) {
      console.error('Error loading availability:', err);
      setError('Failed to load availability settings');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save all availability settings
   */
  const saveAvailability = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Delete all existing availability for this agent
      const { error: deleteError } = await supabase
        .from('agent_availability')
        .delete()
        .eq('agent_id', agentId);

      if (deleteError) throw deleteError;

      // Prepare all inserts
      const inserts: AgentAvailabilityInsert[] = [];

      // Add recurring schedules
      recurringSchedule.forEach(schedule => {
        inserts.push({
          agent_id: agentId,
          availability_type: 'recurring',
          day_of_week: schedule.day,
          start_time: schedule.startTime,
          end_time: schedule.endTime,
          title: schedule.title,
          buffer_before: bufferBefore,
          buffer_after: bufferAfter,
          is_active: true
        });
      });

      // Add one-time blocks
      oneTimeBlocks.forEach(block => {
        inserts.push({
          agent_id: agentId,
          availability_type: 'one_time',
          start_datetime: block.startDateTime,
          end_datetime: block.endDateTime,
          title: block.title,
          buffer_before: bufferBefore,
          buffer_after: bufferAfter,
          is_active: true
        });
      });

      // Add blackout dates
      blackoutDates.forEach(blackout => {
        inserts.push({
          agent_id: agentId,
          availability_type: 'blackout',
          start_datetime: blackout.startDateTime,
          end_datetime: blackout.endDateTime,
          title: blackout.title,
          is_active: true
        });
      });

      // Insert all at once
      if (inserts.length > 0) {
        const { error: insertError } = await supabase
          .from('agent_availability')
          .insert(inserts);

        if (insertError) throw insertError;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSaveSuccess?.();

    } catch (err) {
      console.error('Error saving availability:', err);
      setError('Failed to save availability settings');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Add recurring schedule
   */
  const addRecurringSchedule = () => {
    setRecurringSchedule([...recurringSchedule, newRecurring]);
    setNewRecurring({
      day: 1,
      startTime: '09:00',
      endTime: '17:00',
      title: 'Office Hours'
    });
    setShowAddRecurring(false);
  };

  /**
   * Remove recurring schedule
   */
  const removeRecurringSchedule = (index: number) => {
    setRecurringSchedule(recurringSchedule.filter((_, i) => i !== index));
  };

  /**
   * Add one-time block
   */
  const addOneTimeBlock = () => {
    setOneTimeBlocks([...oneTimeBlocks, newOneTime]);
    setNewOneTime({
      startDateTime: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
      endDateTime: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
      title: 'Special Availability'
    });
    setShowAddOneTime(false);
  };

  /**
   * Remove one-time block
   */
  const removeOneTimeBlock = (index: number) => {
    setOneTimeBlocks(oneTimeBlocks.filter((_, i) => i !== index));
  };

  /**
   * Add blackout date
   */
  const addBlackoutDate = () => {
    setBlackoutDates([...blackoutDates, newBlackout]);
    setNewBlackout({
      startDateTime: format(addDays(new Date(), 1), "yyyy-MM-dd'T'09:00"),
      endDateTime: format(addDays(new Date(), 7), "yyyy-MM-dd'T'17:00"),
      title: 'Vacation'
    });
    setShowAddBlackout(false);
  };

  /**
   * Remove blackout date
   */
  const removeBlackoutDate = (index: number) => {
    setBlackoutDates(blackoutDates.filter((_, i) => i !== index));
  };

  /**
   * Quick add standard work week
   */
  const addStandardWorkWeek = () => {
    const workWeek: RecurringSchedule[] = [];
    for (let day = 1; day <= 5; day++) {
      workWeek.push({
        day,
        startTime: '09:00',
        endTime: '17:00',
        title: `${DAYS_OF_WEEK[day]} Office Hours`
      });
    }
    setRecurringSchedule([...recurringSchedule, ...workWeek]);
  };

  // Load on mount
  useEffect(() => {
    loadAvailability();
  }, [agentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Availability Settings</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage your schedule and availability for property tours
            </p>
          </div>
          
          <button
            onClick={saveAvailability}
            disabled={saving}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 flex items-center space-x-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span>Availability settings saved successfully!</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Buffer Times */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Buffer Times</span>
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Set buffer time before and after appointments to avoid back-to-back bookings
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buffer Before (minutes)
            </label>
            <input
              type="number"
              value={bufferBefore}
              onChange={(e) => setBufferBefore(parseInt(e.target.value) || 0)}
              min="0"
              max="60"
              step="5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buffer After (minutes)
            </label>
            <input
              type="number"
              value={bufferAfter}
              onChange={(e) => setBufferAfter(parseInt(e.target.value) || 0)}
              min="0"
              max="60"
              step="5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Recurring Schedule */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Recurring Weekly Schedule</span>
          </h3>
          
          <div className="flex space-x-2">
            <button
              onClick={addStandardWorkWeek}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Add Standard Week (Mon-Fri 9-5)
            </button>
            <button
              onClick={() => setShowAddRecurring(true)}
              className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom</span>
            </button>
          </div>
        </div>

        {/* Recurring Schedule List */}
        <div className="space-y-2">
          {recurringSchedule.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No recurring schedule set. Add your availability above.</p>
          ) : (
            recurringSchedule.map((schedule, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center space-x-4">
                  <span className="font-medium text-gray-900 w-24">
                    {DAYS_OF_WEEK[schedule.day]}
                  </span>
                  <span className="text-gray-600">
                    {schedule.startTime} - {schedule.endTime}
                  </span>
                  <span className="text-sm text-gray-500">
                    {schedule.title}
                  </span>
                </div>
                
                <button
                  onClick={() => removeRecurringSchedule(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Recurring Form */}
        {showAddRecurring && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Add Recurring Availability</h4>
              <button
                onClick={() => setShowAddRecurring(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                <select
                  value={newRecurring.day}
                  onChange={(e) => setNewRecurring({...newRecurring, day: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {DAYS_OF_WEEK.map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newRecurring.title}
                  onChange={(e) => setNewRecurring({...newRecurring, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={newRecurring.startTime}
                  onChange={(e) => setNewRecurring({...newRecurring, startTime: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={newRecurring.endTime}
                  onChange={(e) => setNewRecurring({...newRecurring, endTime: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <button
              onClick={addRecurringSchedule}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add to Schedule
            </button>
          </div>
        )}
      </div>

      {/* One-Time Availability */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">One-Time Availability</h3>
          <button
            onClick={() => setShowAddOneTime(true)}
            className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add Block</span>
          </button>
        </div>

        <div className="space-y-2">
          {oneTimeBlocks.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No one-time availability blocks set.</p>
          ) : (
            oneTimeBlocks.map((block, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
              >
                <div>
                  <div className="font-medium text-gray-900">{block.title}</div>
                  <div className="text-sm text-gray-600">
                    {format(new Date(block.startDateTime), 'MMM d, yyyy h:mm a')} - {format(new Date(block.endDateTime), 'h:mm a')}
                  </div>
                </div>
                
                <button
                  onClick={() => removeOneTimeBlock(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {showAddOneTime && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Add One-Time Availability</h4>
              <button
                onClick={() => setShowAddOneTime(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newOneTime.title}
                  onChange={(e) => setNewOneTime({...newOneTime, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date/Time</label>
                  <input
                    type="datetime-local"
                    value={newOneTime.startDateTime}
                    onChange={(e) => setNewOneTime({...newOneTime, startDateTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date/Time</label>
                  <input
                    type="datetime-local"
                    value={newOneTime.endDateTime}
                    onChange={(e) => setNewOneTime({...newOneTime, endDateTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            <button
              onClick={addOneTimeBlock}
              className="w-full mt-3 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Add Availability Block
            </button>
          </div>
        )}
      </div>

      {/* Blackout Dates */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Blackout Dates (Vacations)</h3>
          <button
            onClick={() => setShowAddBlackout(true)}
            className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add Blackout</span>
          </button>
        </div>

        <div className="space-y-2">
          {blackoutDates.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No blackout dates set.</p>
          ) : (
            blackoutDates.map((blackout, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
              >
                <div>
                  <div className="font-medium text-gray-900">{blackout.title}</div>
                  <div className="text-sm text-gray-600">
                    {format(new Date(blackout.startDateTime), 'MMM d, yyyy')} - {format(new Date(blackout.endDateTime), 'MMM d, yyyy')}
                  </div>
                </div>
                
                <button
                  onClick={() => removeBlackoutDate(index)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {showAddBlackout && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Add Blackout Date</h4>
              <button
                onClick={() => setShowAddBlackout(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (e.g., "Vacation")</label>
                <input
                  type="text"
                  value={newBlackout.title}
                  onChange={(e) => setNewBlackout({...newBlackout, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    value={newBlackout.startDateTime}
                    onChange={(e) => setNewBlackout({...newBlackout, startDateTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    value={newBlackout.endDateTime}
                    onChange={(e) => setNewBlackout({...newBlackout, endDateTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            <button
              onClick={addBlackoutDate}
              className="w-full mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Add Blackout Date
            </button>
          </div>
        )}
      </div>

      {/* Save Button (Bottom) */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <button
          onClick={saveAvailability}
          disabled={saving}
          className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 flex items-center justify-center space-x-2 text-lg font-semibold"
        >
          {saving ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="w-6 h-6" />
              <span>Save All Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
