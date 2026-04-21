import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = 'https://vwkxqmgsrttogykhmasw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3a3hxbWdzcnR0b2d5a2htYXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODMzOTcsImV4cCI6MjA4NDU1OTM5N30.dr1W-jPek81rb0ak6rwft8UjK-VS7NnlQYBeNWVdgwk';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type { Database };
