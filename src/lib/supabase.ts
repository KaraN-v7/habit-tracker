import { createClient } from '@supabase/supabase-js';

// Use environment variables in production, fallback to hardcoded values in development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lmjummjkdvrjcerteflb.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtanVtbWprZHZyamNlcnRlZmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjE2ODMsImV4cCI6MjA3OTQ5NzY4M30.jS6pkDlfm_X0M5Y_qQ8ggqWoD1o9Yho8YE8Z7zHpojA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
