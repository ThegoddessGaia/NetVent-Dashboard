import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Event, AgendaItem, EventWithAnalytics, Database } from '../types/database';

type EventInsert = Database['public']['Tables']['events']['Insert'];
type EventUpdate = Database['public']['Tables']['events']['Update'];

interface EventState {
  events: EventWithAnalytics[];
  currentEvent: Event | null;
  agendaItems: AgendaItem[];
  isLoading: boolean;
  error: string | null;

  fetchEvents: (organizerId: string) => Promise<void>;
  fetchEvent: (eventId: string) => Promise<void>;
  createEvent: (event: EventInsert) => Promise<Event | null>;
  updateEvent: (eventId: string, updates: EventUpdate) => Promise<boolean>;
  deleteEvent: (eventId: string) => Promise<boolean>;
  
  fetchAgendaItems: (eventId: string) => Promise<void>;
  createAgendaItem: (item: Omit<AgendaItem, 'id' | 'created_at'>) => Promise<AgendaItem | null>;
  updateAgendaItem: (itemId: string, updates: Partial<AgendaItem>) => Promise<boolean>;
  deleteAgendaItem: (itemId: string) => Promise<boolean>;
  
  clearError: () => void;
}

export const useEventStore = create<EventState>((set, _get) => ({
  events: [],
  currentEvent: null,
  agendaItems: [],
  isLoading: false,
  error: null,

  fetchEvents: async (organizerId: string) => {
    set({ isLoading: true, error: null });
    try {
      // First fetch events
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', organizerId)
        .order('start_date', { ascending: false });

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      // Fetch analytics for each event
      const { data: analytics } = await supabase
        .from('organizer_event_analytics')
        .select('*')
        .eq('organizer_id', organizerId);

      const eventsWithAnalytics = (events || []).map((event: any) => {
        const eventAnalytics = (analytics as any[])?.find((a: any) => a.event_id === event.id);
        return {
          ...event,
          registration_count: eventAnalytics?.registration_count || 0,
          checked_in_count: eventAnalytics?.checked_in_count || 0,
        };
      });

      set({ events: eventsWithAnalytics as EventWithAnalytics[], isLoading: false });
    } catch (err) {
      set({ error: 'Failed to fetch events', isLoading: false });
    }
  },

  fetchEvent: async (eventId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      set({ currentEvent: data as Event, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to fetch event', isLoading: false });
    }
  },

  createEvent: async (event) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('events')
        .insert(event as any)
        .select()
        .single();

      if (error) {
        set({ error: error.message, isLoading: false });
        return null;
      }

      const newEvent = data as Event;
      set(state => ({ 
        events: [{ ...newEvent, registration_count: 0, checked_in_count: 0 }, ...state.events],
        isLoading: false 
      }));
      return newEvent;
    } catch (err) {
      set({ error: 'Failed to create event', isLoading: false });
      return null;
    }
  },

  updateEvent: async (eventId: string, updates: EventUpdate) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('events')
        // @ts-ignore - Supabase types issue
        .update(updates)
        .eq('id', eventId);

      if (error) {
        set({ error: error.message, isLoading: false });
        return false;
      }

      set(state => ({
        events: state.events.map(e => 
          e.id === eventId ? { ...e, ...updates } : e
        ),
        currentEvent: state.currentEvent?.id === eventId 
          ? { ...state.currentEvent, ...updates }
          : state.currentEvent,
        isLoading: false
      }));
      return true;
    } catch (err) {
      set({ error: 'Failed to update event', isLoading: false });
      return false;
    }
  },

  deleteEvent: async (eventId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) {
        set({ error: error.message, isLoading: false });
        return false;
      }

      set(state => ({
        events: state.events.filter(e => e.id !== eventId),
        isLoading: false
      }));
      return true;
    } catch (err) {
      set({ error: 'Failed to delete event', isLoading: false });
      return false;
    }
  },

  fetchAgendaItems: async (eventId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('agenda_items')
        .select('*')
        .eq('event_id', eventId)
        .order('start_time', { ascending: true });

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      set({ agendaItems: data as AgendaItem[], isLoading: false });
    } catch (err) {
      set({ error: 'Failed to fetch agenda items', isLoading: false });
    }
  },

  createAgendaItem: async (item) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('agenda_items')
        .insert(item as any)
        .select()
        .single();

      if (error) {
        set({ error: error.message, isLoading: false });
        return null;
      }

      const newItem = data as AgendaItem;
      set(state => ({ 
        agendaItems: [...state.agendaItems, newItem].sort((a, b) => 
          new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime()
        ),
        isLoading: false 
      }));
      return newItem;
    } catch (err) {
      set({ error: 'Failed to create agenda item', isLoading: false });
      return null;
    }
  },

  updateAgendaItem: async (itemId: string, updates: Partial<AgendaItem>) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('agenda_items')
        // @ts-ignore - Supabase types issue
        .update(updates)
        .eq('id', itemId);

      if (error) {
        set({ error: error.message, isLoading: false });
        return false;
      }

      set(state => ({
        agendaItems: state.agendaItems.map(item => 
          item.id === itemId ? { ...item, ...updates } : item
        ),
        isLoading: false
      }));
      return true;
    } catch (err) {
      set({ error: 'Failed to update agenda item', isLoading: false });
      return false;
    }
  },

  deleteAgendaItem: async (itemId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('agenda_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        set({ error: error.message, isLoading: false });
        return false;
      }

      set(state => ({
        agendaItems: state.agendaItems.filter(item => item.id !== itemId),
        isLoading: false
      }));
      return true;
    } catch (err) {
      set({ error: 'Failed to delete agenda item', isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
