'use client';

/**
 * CalendarView Component
 * 
 * Full-featured calendar for viewing agent availability and booked tours
 * Features:
 * - Month, week, day views
 * - Agent availability display
 * - Booked tours visualization
 * - Click-to-book interface
 * - Color-coded by status
 * - Real-time updates
 * 
 * Created: November 17, 2025 - 2:50 AM EST
 * Standard: Henderson Standard - Fortune 50 Quality
 */

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  User,
  Home,
  Loader2
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  addDays,
  addMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  startOfDay,
  endOfDay
} from 'date-fns';

type Tour = Database['public']['Tables']['tours']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Property = Database['public']['Tables']['properties']['Row'];

interface TourWithDetails extends Tour {
  buyer: Profile;
  agent: Profile;
  property: Property;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'tour' | 'available' | 'blackout';
  status?: string;
  details?: TourWithDetails;
}

interface CalendarViewProps {
  agentId?: string;  // Filter by specific agent
  onTourClick?: (tour: TourWithDetails) => void;
  onTimeSlotClick?: (date: Date, agentId?: string) => void;
  viewMode?: 'month' | 'week' | 'day';
}

export default function CalendarView({
  agentId,
  onTourClick,
  onTimeSlotClick,
  viewMode: initialViewMode = 'month'
}: CalendarViewProps) {
  const supabase = createClientComponentClient<Database>();
  
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>(initialViewMode);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Profile[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>(agentId);

  /**
   * Load calendar events for current view
   */
  const loadEvents = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on view mode
      let startDate: Date;
      let endDate: Date;
      
      if (viewMode === 'month') {
        startDate = startOfWeek(startOfMonth(currentDate));
        endDate = endOfWeek(endOfMonth(currentDate));
      } else if (viewMode === 'week') {
        startDate = startOfWeek(currentDate);
        endDate = endOfWeek(currentDate);
      } else {
        startDate = startOfDay(currentDate);
        endDate = endOfDay(currentDate);
      }

      // Load tours for date range
      let tourQuery = supabase
        .from('tours')
        .select(`
          *,
          buyer:buyer_id(*),
          agent:agent_id(*),
          property:property_id(*)
        `)
        .gte('scheduled_for', startDate.toISOString())
        .lte('scheduled_for', endDate.toISOString())
        .in('status', ['pending', 'confirmed', 'rescheduled']);

      if (selectedAgent) {
        tourQuery = tourQuery.eq('agent_id', selectedAgent);
      }

      const { data: toursData, error: toursError } = await tourQuery;

      if (toursError) throw toursError;

      // Convert tours to calendar events
      const tourEvents: CalendarEvent[] = (toursData || []).map(tour => ({
        id: tour.id,
        title: `Tour: ${tour.property.address}`,
        start: parseISO(tour.scheduled_for),
        end: new Date(parseISO(tour.scheduled_for).getTime() + 60 * 60 * 1000), // 1 hour
        type: 'tour' as const,
        status: tour.status,
        details: tour as TourWithDetails
      }));

      setEvents(tourEvents);
    } catch (error) {
      console.error('Error loading calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load available agents
   */
  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'agent')
        .eq('status', 'approved')
        .order('full_name');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  /**
   * Subscribe to real-time tour updates
   */
  useEffect(() => {
    loadEvents();
    loadAgents();

    // Subscribe to tour changes
    const channel = supabase
      .channel('calendar-tours')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tours'
        },
        () => {
          loadEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentDate, viewMode, selectedAgent]);

  /**
   * Navigate calendar
   */
  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, direction === 'next' ? 7 : -7));
    } else {
      setCurrentDate(addDays(currentDate, direction === 'next' ? 1 : -1));
    }
  };

  /**
   * Get events for specific date
   */
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => isSameDay(event.start, date));
  };

  /**
   * Get status color
   */
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'rescheduled':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  /**
   * Render month view
   */
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows: Date[][] = [];
    let days: Date[] = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        days.push(day);
        day = addDays(day, 1);
      }
      rows.push(days);
      days = [];
    }

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
          <div key={dayName} className="bg-gray-50 p-2 text-center text-sm font-semibold text-gray-700">
            {dayName}
          </div>
        ))}

        {/* Calendar days */}
        {rows.map((week, weekIdx) => (
          week.map((day, dayIdx) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);

            return (
              <div
                key={`${weekIdx}-${dayIdx}`}
                className={`min-h-[100px] bg-white p-2 ${
                  !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                } ${isDayToday ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => onTimeSlotClick?.(day, selectedAgent)}
              >
                <div className={`text-sm font-semibold mb-1 ${isDayToday ? 'text-blue-600' : ''}`}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (event.details) onTourClick?.(event.details);
                      }}
                      className={`text-xs p-1 rounded border cursor-pointer hover:shadow-sm transition-shadow ${getStatusColor(event.status)}`}
                    >
                      <div className="font-medium truncate">{format(event.start, 'HH:mm')}</div>
                      <div className="truncate">{event.title}</div>
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-500 pl-1">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ))}
      </div>
    );
  };

  /**
   * Render week view
   */
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM - 8 PM

    return (
      <div className="flex flex-col">
        {/* Day headers */}
        <div className="grid grid-cols-8 gap-px bg-gray-200 border border-gray-200 rounded-t-lg overflow-hidden">
          <div className="bg-gray-50 p-2"></div>
          {weekDays.map(day => (
            <div key={day.toString()} className={`bg-gray-50 p-2 text-center ${isToday(day) ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="text-sm font-semibold text-gray-700">{format(day, 'EEE')}</div>
              <div className={`text-xl font-bold ${isToday(day) ? 'text-blue-600' : 'text-gray-900'}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time slots */}
        <div className="grid grid-cols-8 gap-px bg-gray-200 border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
          {hours.map(hour => (
            <>
              <div key={`hour-${hour}`} className="bg-gray-50 p-2 text-xs text-gray-600 text-right">
                {format(new Date().setHours(hour, 0), 'ha')}
              </div>
              {weekDays.map(day => {
                const slotStart = new Date(day);
                slotStart.setHours(hour, 0, 0, 0);
                const slotEvents = events.filter(event => 
                  event.start.getHours() === hour && isSameDay(event.start, day)
                );

                return (
                  <div
                    key={`${day}-${hour}`}
                    className="bg-white p-1 min-h-[60px] border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onTimeSlotClick?.(slotStart, selectedAgent)}
                  >
                    {slotEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (event.details) onTourClick?.(event.details);
                        }}
                        className={`text-xs p-1 rounded border mb-1 ${getStatusColor(event.status)}`}
                      >
                        <div className="font-medium">{format(event.start, 'HH:mm')}</div>
                        <div className="truncate">{event.title}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Render day view
   */
  const renderDayView = () => {
    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM - 8 PM
    
    return (
      <div className="space-y-px">
        {hours.map(hour => {
          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEvents = events.filter(event => event.start.getHours() === hour);

          return (
            <div
              key={hour}
              className="flex bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onTimeSlotClick?.(slotStart, selectedAgent)}
            >
              <div className="w-24 text-sm font-semibold text-gray-700">
                {format(slotStart, 'h:mm a')}
              </div>
              
              <div className="flex-1 space-y-2">
                {slotEvents.length > 0 ? (
                  slotEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (event.details) onTourClick?.(event.details);
                      }}
                      className={`p-3 rounded-lg border ${getStatusColor(event.status)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{event.title}</span>
                        <span className="text-xs uppercase px-2 py-1 rounded bg-white">
                          {event.status}
                        </span>
                      </div>
                      
                      {event.details && (
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span>Buyer: {event.details.buyer.full_name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span>Agent: {event.details.agent.full_name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Home className="w-4 h-4" />
                            <span>{event.details.property.address}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-400 italic">No tours scheduled</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <h2 className="text-2xl font-bold text-gray-900">
            {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : 'MMMM d, yyyy')}
          </h2>
          
          <button
            onClick={() => navigate('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {/* Agent Filter */}
          {agents.length > 0 && (
            <select
              value={selectedAgent || ''}
              onChange={(e) => setSelectedAgent(e.target.value || undefined)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Agents</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.full_name}
                </option>
              ))}
            </select>
          )}

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['month', 'week', 'day'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
                  viewMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
        </>
      )}

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
          <span>Confirmed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
          <span>Pending</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div>
          <span>Rescheduled</span>
        </div>
      </div>
    </div>
  );
}
