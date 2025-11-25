-- ============================================
-- HABIT TRACKER - SUPABASE DATABASE SCHEMA
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- This will create all necessary tables and security policies

-- ============================================
-- 1. DAILY GOALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS daily_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    block_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('text', 'todo')),
    content TEXT NOT NULL DEFAULT '',
    completed BOOLEAN DEFAULT FALSE,
    source TEXT DEFAULT 'daily' CHECK (source IN ('daily', 'weekly', 'monthly')),
    parent_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date, block_id)
);

-- ============================================
-- 2. WEEKLY GOALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    week_start DATE NOT NULL,
    goal_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_start, goal_id)
);

-- ============================================
-- 3. WEEKLY GOAL COMPLETIONS (for tracking daily completion)
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_goal_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    weekly_goal_id UUID REFERENCES weekly_goals(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(weekly_goal_id, date)
);

-- ============================================
-- 4. MONTHLY GOALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS monthly_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 0 AND month <= 11),
    goal_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, year, month, goal_id)
);

-- ============================================
-- 5. MONTHLY GOAL COMPLETIONS (for tracking daily completion)
-- ============================================
CREATE TABLE IF NOT EXISTS monthly_goal_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    monthly_goal_id UUID REFERENCES monthly_goals(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(monthly_goal_id, date)
);

-- ============================================
-- 6. SUBJECTS TABLE (for syllabus)
-- ============================================
CREATE TABLE IF NOT EXISTS subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, subject_id)
);

-- ============================================
-- 7. CHAPTERS TABLE (for syllabus)
-- ============================================
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
-- 8. USER PREFERENCES TABLE
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
-- INDEXES for better performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_daily_goals_user_date ON daily_goals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_week ON weekly_goals(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_monthly_goals_user_month ON monthly_goals(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_chapters_subject ON chapters(subject_id);


-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Enable RLS on all tables
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_goal_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_goal_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Daily Goals Policies
CREATE POLICY "Users can view their own daily goals"
    ON daily_goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily goals"
    ON daily_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily goals"
    ON daily_goals FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily goals"
    ON daily_goals FOR DELETE
    USING (auth.uid() = user_id);

-- Weekly Goals Policies
CREATE POLICY "Users can view their own weekly goals"
    ON weekly_goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly goals"
    ON weekly_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly goals"
    ON weekly_goals FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly goals"
    ON weekly_goals FOR DELETE
    USING (auth.uid() = user_id);

-- Weekly Goal Completions Policies
CREATE POLICY "Users can view their own weekly goal completions"
    ON weekly_goal_completions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM weekly_goals
        WHERE weekly_goals.id = weekly_goal_completions.weekly_goal_id
        AND weekly_goals.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own weekly goal completions"
    ON weekly_goal_completions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM weekly_goals
        WHERE weekly_goals.id = weekly_goal_completions.weekly_goal_id
        AND weekly_goals.user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own weekly goal completions"
    ON weekly_goal_completions FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM weekly_goals
        WHERE weekly_goals.id = weekly_goal_completions.weekly_goal_id
        AND weekly_goals.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own weekly goal completions"
    ON weekly_goal_completions FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM weekly_goals
        WHERE weekly_goals.id = weekly_goal_completions.weekly_goal_id
        AND weekly_goals.user_id = auth.uid()
    ));

-- Monthly Goals Policies
CREATE POLICY "Users can view their own monthly goals"
    ON monthly_goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly goals"
    ON monthly_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly goals"
    ON monthly_goals FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly goals"
    ON monthly_goals FOR DELETE
    USING (auth.uid() = user_id);

-- Monthly Goal Completions Policies
CREATE POLICY "Users can view their own monthly goal completions"
    ON monthly_goal_completions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM monthly_goals
        WHERE monthly_goals.id = monthly_goal_completions.monthly_goal_id
        AND monthly_goals.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own monthly goal completions"
    ON monthly_goal_completions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM monthly_goals
        WHERE monthly_goals.id = monthly_goal_completions.monthly_goal_id
        AND monthly_goals.user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own monthly goal completions"
    ON monthly_goal_completions FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM monthly_goals
        WHERE monthly_goals.id = monthly_goal_completions.monthly_goal_id
        AND monthly_goals.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own monthly goal completions"
    ON monthly_goal_completions FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM monthly_goals
        WHERE monthly_goals.id = monthly_goal_completions.monthly_goal_id
        AND monthly_goals.user_id = auth.uid()
    ));

-- Subjects Policies
CREATE POLICY "Users can view their own subjects"
    ON subjects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subjects"
    ON subjects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subjects"
    ON subjects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subjects"
    ON subjects FOR DELETE
    USING (auth.uid() = user_id);

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
-- FUNCTIONS for automatic timestamp updates
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_daily_goals_updated_at BEFORE UPDATE ON daily_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_goals_updated_at BEFORE UPDATE ON weekly_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_goal_completions_updated_at BEFORE UPDATE ON weekly_goal_completions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_goals_updated_at BEFORE UPDATE ON monthly_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_goal_completions_updated_at BEFORE UPDATE ON monthly_goal_completions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SYNC TRIGGER: Sync daily goals with chapters
-- ============================================
-- Function to sync daily goal completion with syllabus chapters
CREATE OR REPLACE FUNCTION sync_daily_goal_to_chapter()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if parent_id is present (which stores the chapter_id)
    IF NEW.parent_id IS NOT NULL THEN
        -- Update the corresponding chapter's completion status
        -- We join with subjects to ensure we only update chapters belonging to the correct user
        UPDATE chapters c
        SET completed = NEW.completed,
            updated_at = NOW()
        FROM subjects s
        WHERE c.subject_id = s.id
        AND s.user_id = NEW.user_id
        AND c.chapter_id = NEW.parent_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_sync_daily_goal_chapter ON daily_goals;
CREATE TRIGGER trigger_sync_daily_goal_chapter
AFTER UPDATE OF completed ON daily_goals
FOR EACH ROW
EXECUTE FUNCTION sync_daily_goal_to_chapter();

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Database setup complete!';
    RAISE NOTICE '✅ All tables created successfully';
    RAISE NOTICE '✅ Row Level Security enabled';
    RAISE NOTICE '✅ Security policies applied';
    RAISE NOTICE '✅ Ready to use!';
END $$;