-- ============================================
-- LEADERBOARD & GAMIFICATION SYSTEM
-- ============================================

-- 1. PROFILES TABLE (Publicly visible user info)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- 2. POINTS HISTORY TABLE
CREATE TABLE IF NOT EXISTS points_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    points INTEGER NOT NULL,
    source_type TEXT NOT NULL, -- 'daily_goal', 'study_hour', 'chapter', 'subject'
    source_id TEXT NOT NULL, -- ID of the goal/chapter/subject
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own points history" ON points_history;
CREATE POLICY "Users can view their own points history"
    ON points_history FOR SELECT
    USING (auth.uid() = user_id);
    
-- Allow public read for leaderboard calculation
DROP POLICY IF EXISTS "Points history is viewable by everyone" ON points_history;
CREATE POLICY "Points history is viewable by everyone"
    ON points_history FOR SELECT
    USING (true);

-- NOTE: We do NOT allow users to INSERT/DELETE directly into points_history.
-- This prevents cheating. All modifications happen via the SECURITY DEFINER triggers below.


-- 3. TRIGGER FUNCTION: Handle Daily Goal Points (+2) and Study Hours (+5/hr)
-- SECURITY DEFINER allows this function to bypass RLS on points_history
CREATE OR REPLACE FUNCTION handle_daily_goal_points() RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    study_hours NUMERIC;
    matches TEXT[];
BEGIN
    -- Attempt to extract study hours using regex
    SELECT regexp_matches(LOWER(NEW.content), '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)') INTO matches;
    
    IF matches IS NOT NULL AND array_length(matches, 1) > 0 THEN
        study_hours := matches[1]::NUMERIC;
    ELSE
        study_hours := 0;
    END IF;

    -- IF COMPLETED
    IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
        -- Add Goal Points (+2)
        INSERT INTO points_history (user_id, points, source_type, source_id)
        VALUES (NEW.user_id, 2, 'daily_goal', NEW.id::text);
        
        -- Add Study Points (+5 per hour)
        IF study_hours > 0 THEN
             INSERT INTO points_history (user_id, points, source_type, source_id)
             VALUES (NEW.user_id, floor(study_hours * 5)::INTEGER, 'study_hour', NEW.id::text || '_study');
        END IF;
        
    -- IF UN-COMPLETED
    ELSIF NEW.completed = false AND OLD.completed = true THEN
        -- Remove Goal Points
        DELETE FROM points_history WHERE source_id = NEW.id::text AND source_type = 'daily_goal';
        
        -- Remove Study Points
        DELETE FROM points_history WHERE source_id = NEW.id::text || '_study' AND source_type = 'study_hour';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_daily_goal_points ON daily_goals;
CREATE TRIGGER trigger_daily_goal_points
AFTER UPDATE OF completed ON daily_goals
FOR EACH ROW
EXECUTE FUNCTION handle_daily_goal_points();


-- 4. TRIGGER FUNCTION: Handle Chapter (+10) and Subject (+20) Points
-- SECURITY DEFINER allows this function to bypass RLS on points_history
CREATE OR REPLACE FUNCTION handle_syllabus_points() RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    subject_completed BOOLEAN;
    total_chapters INTEGER;
    completed_chapters INTEGER;
BEGIN
    -- IF CHAPTER COMPLETED
    IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
        -- Add Chapter Points (+10)
        INSERT INTO points_history (user_id, points, source_type, source_id)
        VALUES ((SELECT user_id FROM subjects WHERE id = NEW.subject_id), 10, 'chapter', NEW.id::text);
        
        -- CHECK FOR SUBJECT COMPLETION
        SELECT count(*), count(*) FILTER (WHERE completed = true)
        INTO total_chapters, completed_chapters
        FROM chapters
        WHERE subject_id = NEW.subject_id;
        
        -- If all chapters are now completed (including this one)
        IF total_chapters > 0 AND total_chapters = completed_chapters THEN
             INSERT INTO points_history (user_id, points, source_type, source_id)
             VALUES ((SELECT user_id FROM subjects WHERE id = NEW.subject_id), 20, 'subject', NEW.subject_id::text);
        END IF;

    -- IF CHAPTER UN-COMPLETED
    ELSIF NEW.completed = false AND OLD.completed = true THEN
        -- Remove Chapter Points
        DELETE FROM points_history WHERE source_id = NEW.id::text AND source_type = 'chapter';
        
        -- Remove Subject Points (if it was completed)
        DELETE FROM points_history WHERE source_id = NEW.subject_id::text AND source_type = 'subject';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_syllabus_points ON chapters;
CREATE TRIGGER trigger_syllabus_points
AFTER UPDATE OF completed ON chapters
FOR EACH ROW
EXECUTE FUNCTION handle_syllabus_points();


-- 5. TRIGGER FUNCTION: Enforce Current Date Editing
CREATE OR REPLACE FUNCTION enforce_current_date_edit() RETURNS TRIGGER AS $$
BEGIN
    -- Check if the date of the goal is NOT today
    IF NEW.date != CURRENT_DATE THEN
        RAISE EXCEPTION 'You can only edit goals for the current date (Today).';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to Daily Goals (Update only, as we usually create uncompleted goals)
DROP TRIGGER IF EXISTS trigger_enforce_date_daily ON daily_goals;
CREATE TRIGGER trigger_enforce_date_daily
BEFORE UPDATE OF completed ON daily_goals
FOR EACH ROW
EXECUTE FUNCTION enforce_current_date_edit();

-- Apply to Weekly Goal Completions (INSERT AND UPDATE)
-- Because checking a box often creates a NEW row in this table
DROP TRIGGER IF EXISTS trigger_enforce_date_weekly ON weekly_goal_completions;
CREATE TRIGGER trigger_enforce_date_weekly
BEFORE INSERT OR UPDATE ON weekly_goal_completions
FOR EACH ROW
EXECUTE FUNCTION enforce_current_date_edit();

-- Apply to Monthly Goal Completions (INSERT AND UPDATE)
-- Because checking a box often creates a NEW row in this table
DROP TRIGGER IF EXISTS trigger_enforce_date_monthly ON monthly_goal_completions;
CREATE TRIGGER trigger_enforce_date_monthly
BEFORE INSERT OR UPDATE ON monthly_goal_completions
FOR EACH ROW
EXECUTE FUNCTION enforce_current_date_edit();


-- 6. VIEW: Leaderboard Stats
CREATE OR REPLACE VIEW leaderboard_stats AS
SELECT 
    p.id as user_id,
    p.display_name,
    p.avatar_url,
    COALESCE(SUM(ph.points), 0) as total_points,
    -- Daily Points (Today)
    COALESCE(SUM(CASE WHEN ph.created_at::DATE = CURRENT_DATE THEN ph.points ELSE 0 END), 0) as daily_points,
    -- Weekly Points (This Week)
    COALESCE(SUM(CASE WHEN ph.created_at >= date_trunc('week', CURRENT_DATE) THEN ph.points ELSE 0 END), 0) as weekly_points,
    -- Monthly Points (This Month)
    COALESCE(SUM(CASE WHEN ph.created_at >= date_trunc('month', CURRENT_DATE) THEN ph.points ELSE 0 END), 0) as monthly_points
FROM 
    profiles p
LEFT JOIN 
    points_history ph ON p.id = ph.user_id
GROUP BY 
    p.id, p.display_name, p.avatar_url;

-- Grant access
GRANT SELECT ON leaderboard_stats TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON points_history TO authenticated;
