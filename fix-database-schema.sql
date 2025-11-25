-- ============================================
-- FIX FOR CORRUPTED TABLES IN supabase-setup.sql
-- ============================================
-- Run this AFTER running the main supabase-setup.sql
-- This fixes the chapters table and adds user_preferences table correctly

-- ============================================
-- 1. DROP AND RECREATE CHAPTERS TABLE
-- ============================================
DROP TABLE IF EXISTS chapters CASCADE;

CREATE TABLE IF NOT EXISTS chapters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
    chapter_id TEXT NOT NULL,
    name TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, chapter_id)
);

-- ============================================
-- 2. CREATE USER PREFERENCES TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================
-- 3. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Chapters Policies
CREATE POLICY "Users can view their own chapters"
    ON chapters FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM subjects
        WHERE subjects.id = chapters.subject_id
        AND subjects.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own chapters"
    ON chapters FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM subjects
        WHERE subjects.id = chapters.subject_id
        AND subjects.user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own chapters"
    ON chapters FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM subjects
        WHERE subjects.id = chapters.subject_id
        AND subjects.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own chapters"
    ON chapters FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM subjects
        WHERE subjects.id = chapters.subject_id
        AND subjects.user_id = auth.uid()
    ));

-- User Preferences Policies
CREATE POLICY "Users can view their own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
    ON user_preferences FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 4. TRIGGERS
-- ============================================

-- Update trigger for chapters
DROP TRIGGER IF EXISTS update_chapters_updated_at ON chapters;
CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update trigger for user_preferences
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Tables fixed successfully!';
    RAISE NOTICE '✅ Chapters table recreated';
    RAISE NOTICE '✅ User Preferences table created';
    RAISE NOTICE '✅ All RLS policies applied';
    RAISE NOTICE '✅ Triggers configured';
END $$;
