-- Create notes table with HTML content (Google Docs style)
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT DEFAULT 'Untitled',
  content TEXT DEFAULT '', -- Stores HTML content
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Policies for notes
DROP POLICY IF EXISTS "Users can only see their own notes" ON notes;
CREATE POLICY "Users can only see their own notes" ON notes
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);

-- Drop old note_blocks table if it exists (cleanup)
DROP TABLE IF EXISTS note_blocks CASCADE;

