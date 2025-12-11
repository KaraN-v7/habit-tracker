-- RECREATE NOTES TABLE FROM SCRATCH
-- This will force Supabase to recognize all columns immediately
-- WARNING: This will DELETE all existing notes! Make sure you're okay with that.

-- Drop the existing notes table completely
DROP TABLE IF EXISTS notes CASCADE;

-- Recreate notes table with all required columns
CREATE TABLE notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT 'Untitled' NOT NULL,
  content TEXT DEFAULT '' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policy so users can only access their own notes
CREATE POLICY "Users can manage their own notes" 
ON notes 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX notes_user_id_idx ON notes(user_id);
CREATE INDEX notes_updated_at_idx ON notes(updated_at DESC);

-- Force schema refresh (this notifies PostgREST immediately)
NOTIFY pgrst, 'reload schema';
