import { supabase } from '../lib/supabase';
import type { Badge, BadgeInsert, BadgeUpdate, Speaker, UserBadge } from '../types/database';

type SpeakerInsert = Omit<Speaker, 'id' | 'created_at'>;
type SpeakerUpdate = Partial<Speaker>;

const db = supabase as any;

export const speakersManagement = {
  async getSpeakers(eventId: string): Promise<Speaker[]> {
    const { data, error } = await db
      .from('speakers')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as Speaker[];
  },

  async addSpeaker(eventId: string, speaker: SpeakerInsert): Promise<Speaker> {
    const { data, error } = await db
      .from('speakers')
      .insert({ ...speaker, event_id: eventId })
      .select('*')
      .single();

    if (error) throw error;
    return data as Speaker;
  },

  async updateSpeaker(speakerId: string, updates: SpeakerUpdate): Promise<Speaker> {
    const { data, error } = await db
      .from('speakers')
      .update(updates)
      .eq('id', speakerId)
      .select('*')
      .single();

    if (error) throw error;
    return data as Speaker;
  },

  async deleteSpeaker(speakerId: string): Promise<void> {
    const { error } = await db
      .from('speakers')
      .delete()
      .eq('id', speakerId);

    if (error) throw error;
  },
};

export const badgesManagement = {
  async getBadges(eventId: string): Promise<Badge[]> {
    const { data, error } = await db
      .from('badges')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as Badge[];
  },

  async createBadge(eventId: string, badge: BadgeInsert): Promise<Badge> {
    const { data, error } = await db
      .from('badges')
      .insert({ event_id: eventId, ...badge })
      .select('*')
      .single();

    if (error) throw error;
    return data as Badge;
  },

  async updateBadge(badgeId: string, updates: BadgeUpdate): Promise<Badge> {
    const { data, error } = await db
      .from('badges')
      .update(updates)
      .eq('id', badgeId)
      .select('*')
      .single();

    if (error) throw error;
    return data as Badge;
  },

  async deleteBadge(badgeId: string): Promise<void> {
    const { error } = await db
      .from('badges')
      .delete()
      .eq('id', badgeId);

    if (error) throw error;
  },

  async awardBadge(userId: string, badgeId: string, eventId: string): Promise<UserBadge> {
    const { data: existing } = await db
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .eq('event_id', eventId)
      .maybeSingle();

    if (existing) {
      return existing as UserBadge;
    }

    const { data, error } = await db
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badgeId,
        event_id: eventId,
        earned_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as UserBadge;
  },

  async revokeBadge(userId: string, badgeId: string, eventId: string): Promise<void> {
    const { error } = await db
      .from('user_badges')
      .delete()
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .eq('event_id', eventId);

    if (error) throw error;
  },

  async getUserBadges(userId: string, eventId: string): Promise<UserBadge[]> {
    const { data, error } = await db
      .from('user_badges')
      .select('*, badge:badges(*)')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .order('earned_at', { ascending: false });

    if (error) throw error;
    return (data || []) as UserBadge[];
  },
};
