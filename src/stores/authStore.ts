import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { User } from '../types/database';

interface AuthState {
  user: User | null;
  session: { access_token: string; refresh_token: string } | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      isInitialized: false,
      error: null,

      signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            set({ error: error.message, isLoading: false });
            return false;
          }

          if (data.session) {
            set({ 
              session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token
              }
            });
            await get().fetchUser();
            return true;
          }
          
          return false;
        } catch (err) {
          set({ error: 'An unexpected error occurred', isLoading: false });
          return false;
        }
      },

      signUp: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });

          if (error) {
            set({ error: error.message, isLoading: false });
            return false;
          }

          if (data.user) {
            // Wait a moment for the trigger to create the user profile
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update user profile to set organizer role and name
            // (The user row is auto-created by a database trigger with default 'attendee' role)
            const { error: profileError } = await supabase
              .from('users')
              // @ts-ignore - Supabase types issue
              .update({
                name,
                role: 'organizer',
              })
              .eq('id', data.user.id);

            if (profileError) {
              console.error('Profile update error:', profileError);
              // Don't fail signup - user was created, just role update failed
              // They can update their role later or contact support
            }

            if (data.session) {
              set({ 
                session: {
                  access_token: data.session.access_token,
                  refresh_token: data.session.refresh_token
                }
              });
              await get().fetchUser();
            }
            
            set({ isLoading: false });
            return true;
          }
          
          return false;
        } catch (err) {
          set({ error: 'An unexpected error occurred', isLoading: false });
          return false;
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, error: null });
      },

      initialize: async () => {
        if (get().isInitialized) return;
        
        set({ isLoading: true });
        try {
          // Get current session from Supabase
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            set({ 
              session: {
                access_token: session.access_token,
                refresh_token: session.refresh_token
              }
            });
            
            // Fetch user profile
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              set({ user: profile as User });
            }
          }
        } catch (err) {
          console.error('Auth initialization error:', err);
        } finally {
          set({ isLoading: false, isInitialized: true });
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT') {
            set({ user: null, session: null });
          } else if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
            set({ 
              session: {
                access_token: session.access_token,
                refresh_token: session.refresh_token
              }
            });
          }
        });
      },

      fetchUser: async () => {
        set({ isLoading: true });
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            const { data: profile, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (error) {
              console.error('Fetch user error:', error);
              set({ user: null, isLoading: false });
              return;
            }

            set({ user: profile as User, isLoading: false });
          } else {
            set({ user: null, isLoading: false });
          }
        } catch (err) {
          set({ user: null, isLoading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ session: state.session }),
    }
  )
);
