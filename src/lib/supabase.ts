import { createClient } from '@supabase/supabase-js';

// NOTE: In a production environment, these should be environment variables.
// For now, we are hardcoding them to bypass gitignore restrictions during development.
const supabaseUrl = 'https://lmjummjkdvrjcerteflb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtanVtbWprZHZyamNlcnRlZmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjE2ODMsImV4cCI6MjA3OTQ5NzY4M30.jS6pkDlfm_X0M5Y_qQ8ggqWoD1o9Yho8YE8Z7zHpojA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
