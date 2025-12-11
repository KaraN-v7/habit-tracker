-- Fix notes table by adding missing content column if needed
-- This script is safe to run multiple times

-- First, try to add the content column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notes' 
        AND column_name = 'content'
    ) THEN
        ALTER TABLE notes ADD COLUMN content TEXT DEFAULT '';
    END IF;
END $$;

-- Ensure all required columns exist
DO $$ 
BEGIN
    -- Add title if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notes' AND column_name = 'title'
    ) THEN
        ALTER TABLE notes ADD COLUMN title TEXT DEFAULT 'Untitled';
    END IF;
    
    -- Add created_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notes' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE notes ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add updated_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notes' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE notes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Update policies
DROP POLICY IF EXISTS "Users can only see their own notes" ON notes;
CREATE POLICY "Users can only see their own notes" ON notes
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);

-- Clean up old table if exists
DROP TABLE IF EXISTS note_blocks CASCADE;

-- IMPORTANT: After running this, go to your Supabase Dashboard 
-- and click "Reload schema" in the API settings to refresh the cache.
