import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Campaign, CampaignInsert } from '../types/database';

interface CampaignState {
  campaigns: Campaign[];
  isLoading: boolean;
  error: string | null;

  fetchCampaigns: (organizerId: string, eventId?: string) => Promise<void>;
  createCampaign: (campaign: CampaignInsert) => Promise<Campaign | null>;
  updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<boolean>;
  deleteCampaign: (id: string) => Promise<boolean>;
  sendCampaign: (campaignId: string) => Promise<{ success: boolean; sent_count?: number; error?: string }>;
  clearError: () => void;
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  campaigns: [],
  isLoading: false,
  error: null,

  fetchCampaigns: async (organizerId: string, eventId?: string) => {
    set({ isLoading: true, error: null });
    try {
      let query = supabase
        .from('campaigns')
        .select('*')
        .eq('organizer_id', organizerId)
        .order('created_at', { ascending: false });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data, error } = await query;

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      set({ campaigns: (data || []) as Campaign[], isLoading: false });
    } catch {
      set({ error: 'Failed to fetch campaigns', isLoading: false });
    }
  },

  createCampaign: async (campaign: CampaignInsert) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaign as any)
        .select()
        .single();

      if (error) {
        set({ error: error.message, isLoading: false });
        return null;
      }

      const newCampaign = data as Campaign;
      set((state) => ({
        campaigns: [newCampaign, ...state.campaigns],
        isLoading: false,
      }));
      return newCampaign;
    } catch {
      set({ error: 'Failed to create campaign', isLoading: false });
      return null;
    }
  },

  updateCampaign: async (id: string, updates: Partial<Campaign>) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq('id', id);

      if (error) {
        set({ error: error.message, isLoading: false });
        return false;
      }

      set((state) => ({
        campaigns: state.campaigns.map((c) =>
          c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
        ),
        isLoading: false,
      }));
      return true;
    } catch {
      set({ error: 'Failed to update campaign', isLoading: false });
      return false;
    }
  },

  deleteCampaign: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);

      if (error) {
        set({ error: error.message, isLoading: false });
        return false;
      }

      set((state) => ({
        campaigns: state.campaigns.filter((c) => c.id !== id),
        isLoading: false,
      }));
      return true;
    } catch {
      set({ error: 'Failed to delete campaign', isLoading: false });
      return false;
    }
  },

  sendCampaign: async (campaignId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('send_campaign' as never, {
        p_campaign_id: campaignId,
      } as never);

      if (error) {
        set({ error: error.message, isLoading: false });
        return { success: false, error: error.message };
      }

      const result = data as { success: boolean; sent_count?: number; error?: string };

      if (result.success) {
        // Refresh campaigns to get updated counts
        const { campaigns } = get();
        const campaign = campaigns.find((c) => c.id === campaignId);
        if (campaign) {
          set((state) => ({
            campaigns: state.campaigns.map((c) =>
              c.id === campaignId
                ? {
                    ...c,
                    status: 'active' as const,
                    sent_at: new Date().toISOString(),
                    sent_count: c.sent_count + (result.sent_count || 0),
                  }
                : c
            ),
            isLoading: false,
          }));
        }
      } else {
        set({ error: result.error || 'Failed to send campaign', isLoading: false });
      }

      return result;
    } catch {
      set({ error: 'Failed to send campaign', isLoading: false });
      return { success: false, error: 'Failed to send campaign' };
    }
  },

  clearError: () => set({ error: null }),
}));
