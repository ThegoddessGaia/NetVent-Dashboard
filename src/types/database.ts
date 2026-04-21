// Supabase Database Type Definitions
// Note: Using 'any' for complex nested types to avoid Supabase client type inference issues

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'attendee' | 'organizer';
export type TicketType = 'general' | 'vip' | 'speaker' | 'staff' | 'press' | 'student';
export type RegistrationRole = 'attendee' | 'vip' | 'speaker' | 'staff' | 'organizer';
export type BadgeType = 'attendance' | 'networking' | 'engagement' | 'vip' | 'speaker' | 'custom';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          bio: string | null;
          company: string | null;
          position: string | null;
          interests: string[];
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          avatar_url?: string | null;
          bio?: string | null;
          company?: string | null;
          position?: string | null;
          interests?: string[];
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          company?: string | null;
          position?: string | null;
          interests?: string[];
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string;
          logo_url: string | null;
          banner_url: string | null;
          venue_name: string;
          venue_address: string;
          latitude: number;
          longitude: number;
          radius_meters: number;
          start_date: string;
          end_date: string;
          interests: string[];
          target_audience: string[];
          event_highlights: string[];
          venue_areas: string[];
          venue_area_shapes: Json;
          organizer_id: string;
          venue_map_url: string | null;
          venue_3d_map_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          logo_url?: string | null;
          banner_url?: string | null;
          venue_name: string;
          venue_address: string;
          latitude?: number;
          longitude?: number;
          radius_meters?: number;
          start_date: string;
          end_date: string;
          interests?: string[];
          target_audience?: string[];
          event_highlights?: string[];
          venue_areas?: string[];
          venue_area_shapes?: Json;
          organizer_id: string;
          venue_map_url?: string | null;
          venue_3d_map_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          logo_url?: string | null;
          banner_url?: string | null;
          venue_name?: string;
          venue_address?: string;
          latitude?: number;
          longitude?: number;
          radius_meters?: number;
          start_date?: string;
          end_date?: string;
          interests?: string[];
          target_audience?: string[];
          event_highlights?: string[];
          venue_areas?: string[];
          venue_area_shapes?: Json;
          organizer_id?: string;
          venue_map_url?: string | null;
          venue_3d_map_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      agenda_items: {
        Row: {
          id: string;
          event_id: string;
          title: string;
          description: string | null;
          location_name: string;
          floor: number;
          x_position: number | null;
          y_position: number | null;
          start_time: string | null;
          end_time: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          title: string;
          description?: string | null;
          location_name: string;
          floor?: number;
          x_position?: number | null;
          y_position?: number | null;
          start_time?: string | null;
          end_time?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          title?: string;
          description?: string | null;
          location_name?: string;
          floor?: number;
          x_position?: number | null;
          y_position?: number | null;
          start_time?: string | null;
          end_time?: string | null;
          created_at?: string;
        };
      };
      registrations: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          status: string;
          qr_code: string | null;
          ticket_type: TicketType;
          role: RegistrationRole;
          assigned_zone: string | null;
          notes: string | null;
          checked_in_at: string | null;
          checked_out_at: string | null;
          registered_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          status?: string;
          qr_code?: string | null;
          ticket_type?: TicketType;
          role?: RegistrationRole;
          assigned_zone?: string | null;
          notes?: string | null;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          registered_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string;
          status?: string;
          qr_code?: string | null;
          ticket_type?: TicketType;
          role?: RegistrationRole;
          assigned_zone?: string | null;
          notes?: string | null;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          registered_at?: string;
        };
      };
      check_ins: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          type: string;
          timestamp: string;
          latitude: number | null;
          longitude: number | null;
          method: string;
          beacon_id: string | null;
          device_id: string | null;
          auto_detected: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          type: string;
          timestamp?: string;
          latitude?: number | null;
          longitude?: number | null;
          method?: string;
          beacon_id?: string | null;
          device_id?: string | null;
          auto_detected?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string;
          type?: string;
          timestamp?: string;
          latitude?: number | null;
          longitude?: number | null;
          method?: string;
          beacon_id?: string | null;
          device_id?: string | null;
          auto_detected?: boolean;
        };
      };
      beacon_detections: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          beacon_id: string;
          rssi: number | null;
          detected_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          beacon_id: string;
          rssi?: number | null;
          detected_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string;
          beacon_id?: string;
          rssi?: number | null;
          detected_at?: string;
        };
      };
      speakers: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          title: string | null;
          company: string | null;
          bio: string | null;
          photo_url: string | null;
          linkedin_url: string | null;
          twitter_url: string | null;
          website_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          title?: string | null;
          company?: string | null;
          bio?: string | null;
          photo_url?: string | null;
          linkedin_url?: string | null;
          twitter_url?: string | null;
          website_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          title?: string | null;
          company?: string | null;
          bio?: string | null;
          photo_url?: string | null;
          linkedin_url?: string | null;
          twitter_url?: string | null;
          website_url?: string | null;
          created_at?: string;
        };
      };
      badges: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          description: string | null;
          icon_url: string | null;
          badge_type: BadgeType;
          criteria: string | null;
          sort_order: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          description?: string | null;
          icon_url?: string | null;
          badge_type: BadgeType;
          criteria?: string | null;
          sort_order?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          description?: string | null;
          icon_url?: string | null;
          badge_type?: BadgeType;
          criteria?: string | null;
          sort_order?: number | null;
          created_at?: string;
        };
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          event_id: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          event_id: string;
          earned_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          badge_id?: string;
          event_id?: string;
          earned_at?: string;
        };
      };
      ai_matches: {
        Row: {
          id: string;
          user_id: string;
          matched_user_id: string;
          event_id: string;
          score: number;
          reasons: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          matched_user_id: string;
          event_id: string;
          score: number;
          reasons?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          matched_user_id?: string;
          event_id?: string;
          score?: number;
          reasons?: string[];
          created_at?: string;
        };
      };
      meeting_appointments: {
        Row: {
          id: string;
          requester_id: string;
          invitee_id: string;
          event_id: string;
          title: string | null;
          description: string | null;
          location: string | null;
          scheduled_time: string | null;
          duration_minutes: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          invitee_id: string;
          event_id: string;
          title?: string | null;
          description?: string | null;
          location?: string | null;
          scheduled_time?: string | null;
          duration_minutes?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requester_id?: string;
          invitee_id?: string;
          event_id?: string;
          title?: string | null;
          description?: string | null;
          location?: string | null;
          scheduled_time?: string | null;
          duration_minutes?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          event_id: string | null;
          content: string;
          image_url: string | null;
          likes_count: number;
          comments_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id?: string | null;
          content: string;
          image_url?: string | null;
          likes_count?: number;
          comments_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string | null;
          content?: string;
          image_url?: string | null;
          likes_count?: number;
          comments_count?: number;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
      };
      post_likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requester_id?: string;
          addressee_id?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          event_id: string;
          organizer_id: string;
          name: string;
          title: string;
          message: string;
          status: 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
          target_interests: string[];
          target_ticket_types: string[];
          target_roles: string[];
          target_zones: string[];
          scheduled_at: string | null;
          sent_at: string | null;
          sent_count: number;
          opened_count: number;
          clicked_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          organizer_id: string;
          name: string;
          title: string;
          message: string;
          status?: 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
          target_interests?: string[];
          target_ticket_types?: string[];
          target_roles?: string[];
          target_zones?: string[];
          scheduled_at?: string | null;
          sent_at?: string | null;
          sent_count?: number;
          opened_count?: number;
          clicked_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          organizer_id?: string;
          name?: string;
          title?: string;
          message?: string;
          status?: 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
          target_interests?: string[];
          target_ticket_types?: string[];
          target_roles?: string[];
          target_zones?: string[];
          scheduled_at?: string | null;
          sent_at?: string | null;
          sent_count?: number;
          opened_count?: number;
          clicked_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      campaign_notifications: {
        Row: {
          id: string;
          campaign_id: string;
          user_id: string;
          event_id: string;
          title: string;
          message: string;
          read: boolean;
          opened_at: string | null;
          clicked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          user_id: string;
          event_id: string;
          title: string;
          message: string;
          read?: boolean;
          opened_at?: string | null;
          clicked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          user_id?: string;
          event_id?: string;
          title?: string;
          message?: string;
          read?: boolean;
          opened_at?: string | null;
          clicked_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      organizer_event_analytics: {
        Row: {
          event_id: string;
          event_title: string;
          organizer_id: string;
          start_date: string;
          end_date: string;
          registration_count: number;
          checked_in_count: number;
          checked_out_count: number;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience type aliases
export type User = Database['public']['Tables']['users']['Row'];
export type Event = Database['public']['Tables']['events']['Row'];
export type AgendaItem = Database['public']['Tables']['agenda_items']['Row'];
export type Registration = Database['public']['Tables']['registrations']['Row'];
export type CheckIn = Database['public']['Tables']['check_ins']['Row'];
export type BeaconDetection = Database['public']['Tables']['beacon_detections']['Row'];
export type AIMatch = Database['public']['Tables']['ai_matches']['Row'];
export type MeetingAppointment = Database['public']['Tables']['meeting_appointments']['Row'];
export type Speaker = Database['public']['Tables']['speakers']['Row'];
export type BadgeRow = Database['public']['Tables']['badges']['Row'];
export type BadgeInsertRow = Database['public']['Tables']['badges']['Insert'];
export type BadgeUpdateRow = Database['public']['Tables']['badges']['Update'];
export type UserBadgeRow = Database['public']['Tables']['user_badges']['Row'];
export type Post = Database['public']['Tables']['posts']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type PostLike = Database['public']['Tables']['post_likes']['Row'];
export type Friendship = Database['public']['Tables']['friendships']['Row'];
export type Campaign = Database['public']['Tables']['campaigns']['Row'];
export type CampaignInsert = Database['public']['Tables']['campaigns']['Insert'];
export type CampaignNotification = Database['public']['Tables']['campaign_notifications']['Row'];
export type OrganizerEventAnalytics = Database['public']['Views']['organizer_event_analytics']['Row'];

// Bluetooth device type
export interface BluetoothDevice {
  id: string;
  event_id: string;
  device_name: string;
  device_mac: string;
  beacon_uuid: string | null;
  major: number | null;
  minor: number | null;
  zone_name: string;
  location_type: string;
  floor: number;
  x_position: number | null;
  y_position: number | null;
  is_active: boolean;
  last_ping: string | null;
  created_at: string;
}

// Auto check-in log type
export interface AutoCheckInLog {
  id: string;
  event_id: string;
  user_id: string;
  beacon_device_id: string | null;
  detection_type: string;
  signal_strength: number | null;
  detected_at: string;
  confirmed: boolean;
  confirmed_by: string | null;
  confirmed_at: string | null;
}

// Dwell time view type
export interface AttendeeDwellTime {
  user_id: string;
  event_id: string;
  attendee_name: string;
  attendee_email: string;
  company: string | null;
  ticket_type: string;
  attendee_role: string;
  first_check_in: string | null;
  last_check_out: string | null;
  total_check_ins: number;
  total_check_outs: number;
  dwell_time_minutes: number | null;
}

// Extended types with relations
export interface RegistrationWithUser extends Registration {
  user: User;
}

export interface CheckInWithUser extends CheckIn {
  user: User;
}

export interface AutoCheckInWithUser extends AutoCheckInLog {
  user?: User;
  beacon_device?: BluetoothDevice;
}

export interface EventWithAnalytics extends Event {
  registration_count?: number;
  checked_in_count?: number;
}

export interface Badge extends BadgeRow {}

export interface BadgeInsert extends Omit<BadgeInsertRow, 'event_id'> {
  event_id?: string;
}

export interface BadgeUpdate extends BadgeUpdateRow {}

export interface UserBadge extends UserBadgeRow {
  badge?: Badge;
  user?: User;
}
