-- =================================================================
-- NEW STREAK-ONLY POINT SYSTEM (V2)
-- =================================================================

-- 1. CLEANUP OLD SYSTEM
-- =====================
DROP TRIGGER IF EXISTS trigger_daily_goal_points ON daily_goals;
DROP FUNCTION IF EXISTS handle_daily_goal_points();

DROP TRIGGER IF EXISTS trigger_syllabus_points ON chapters;
DROP FUNCTION IF EXISTS handle_syllabus_points();

-- We are resetting the points history to start fresh with the new system
TRUNCATE TABLE points_history;

-- 2. STREAK CALCULATION FUNCTIONS
-- ===============================

-- For Weekly Goals
CREATE OR REPLACE FUNCTION handle_weekly_streak_points() RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    is_streak_active BOOLEAN;
    goal_user_id UUID;
BEGIN
    -- Get User ID from the parent goal table
    SELECT user_id INTO goal_user_id FROM weekly_goals WHERE id = NEW.weekly_goal_id;

    -- IF COMPLETED (Marked as Done)
    IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
        
        -- Check if the previous day was completed for this SAME goal
        SELECT EXISTS (
            SELECT 1 FROM weekly_goal_completions
            WHERE weekly_goal_id = NEW.weekly_goal_id
            AND date = (NEW.date - INTERVAL '1 day')::DATE
            AND completed = true
        ) INTO is_streak_active;

        -- Award 2 points ONLY if streak is active (yesterday was done)
        IF is_streak_active THEN
            INSERT INTO points_history (user_id, points, source_type, source_id)
            VALUES (goal_user_id, 2, 'streak_weekly', NEW.id::text);
        END IF;

    -- IF UN-COMPLETED (Marked as Not Done)
    ELSIF NEW.completed = false AND OLD.completed = true THEN
        -- Remove points associated with this specific completion
        DELETE FROM points_history 
        WHERE source_id = NEW.id::text 
        AND source_type = 'streak_weekly';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- For Monthly Goals
CREATE OR REPLACE FUNCTION handle_monthly_streak_points() RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    is_streak_active BOOLEAN;
    goal_user_id UUID;
BEGIN
    -- Get User ID from the parent goal table
    SELECT user_id INTO goal_user_id FROM monthly_goals WHERE id = NEW.monthly_goal_id;

    -- IF COMPLETED
    IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
        
        -- Check if the previous day was completed for this SAME goal
        SELECT EXISTS (
            SELECT 1 FROM monthly_goal_completions
            WHERE monthly_goal_id = NEW.monthly_goal_id
            AND date = (NEW.date - INTERVAL '1 day')::DATE
            AND completed = true
        ) INTO is_streak_active;

        -- Award 2 points ONLY if streak is active
        IF is_streak_active THEN
            INSERT INTO points_history (user_id, points, source_type, source_id)
            VALUES (goal_user_id, 2, 'streak_monthly', NEW.id::text);
        END IF;

    -- IF UN-COMPLETED
    ELSIF NEW.completed = false AND OLD.completed = true THEN
        -- Remove points
        DELETE FROM points_history 
        WHERE source_id = NEW.id::text 
        AND source_type = 'streak_monthly';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. APPLY TRIGGERS
-- =================
DROP TRIGGER IF EXISTS trigger_weekly_streak_points ON weekly_goal_completions;
CREATE TRIGGER trigger_weekly_streak_points
AFTER UPDATE OF completed OR INSERT ON weekly_goal_completions
FOR EACH ROW
EXECUTE FUNCTION handle_weekly_streak_points();

DROP TRIGGER IF EXISTS trigger_monthly_streak_points ON monthly_goal_completions;
CREATE TRIGGER trigger_monthly_streak_points
AFTER UPDATE OF completed OR INSERT ON monthly_goal_completions
FOR EACH ROW
EXECUTE FUNCTION handle_monthly_streak_points();

-- 4. UPDATE LEADERBOARD RPCS
-- ==========================

-- Function to get detailed stats for a specific user in a range
CREATE OR REPLACE FUNCTION get_user_period_details(
    target_user_id UUID,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ
)
RETURNS TABLE (
    goals_completed BIGINT,
    chapters_completed BIGINT,
    subjects_completed BIGINT,
    study_hours NUMERIC,
    total_points BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Count only daily/weekly/monthly goals that actually exist within range
        (
         (SELECT COUNT(*) FROM daily_goals WHERE user_id = target_user_id AND date >= start_time::date AND date <= end_time::date AND completed = true)
         +
         (SELECT COUNT(*) FROM weekly_goal_completions wgc JOIN weekly_goals wg ON wgc.weekly_goal_id = wg.id WHERE wg.user_id = target_user_id AND wgc.date >= start_time::date AND wgc.date <= end_time::date AND wgc.completed = true)
         +
         (SELECT COUNT(*) FROM monthly_goal_completions mgc JOIN monthly_goals mg ON mgc.monthly_goal_id = mg.id WHERE mg.user_id = target_user_id AND mgc.date >= start_time::date AND mgc.date <= end_time::date AND mgc.completed = true)
        ) as goals_completed,
        
        -- Count chapters updated in this range (or just total? Defaulting to updated in range for 'period' logic, but usually users want all-time for syllabus. Let's stick to ALL TIME for syllabus items to be safe/useful)
        -- actually, keeping it consistent with 'period':
        (SELECT COUNT(*) FROM chapters c JOIN subjects s ON c.subject_id = s.id WHERE s.user_id = target_user_id AND c.completed = true AND c.updated_at >= start_time AND c.updated_at <= end_time) as chapters_completed,
        (SELECT COUNT(*) FROM subjects s WHERE s.user_id = target_user_id AND s.updated_at >= start_time AND s.updated_at <= end_time) as subjects_completed,
        
        -- Calculate Study Hours from Daily Goals Content
        COALESCE(
            (SELECT SUM(
                COALESCE((regexp_matches(LOWER(content), '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)'))[1]::NUMERIC, 0)
            ) 
            FROM daily_goals 
            WHERE user_id = target_user_id 
            AND date >= start_time::date 
            AND date <= end_time::date
            AND completed = true),
            0
        ) as study_hours,
        
        -- Total Points from History (Streak Only)
        COALESCE(SUM(ph.points), 0) as total_points
    FROM
        points_history ph
    WHERE
        ph.user_id = target_user_id
        AND ph.created_at >= start_time
        AND ph.created_at <= end_time;
END;
$$;

-- Ensure get_period_leaderboard sums correctly
CREATE OR REPLACE FUNCTION get_period_leaderboard(
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ
)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    total_points BIGINT,
    rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id as user_id,
        p.display_name,
        p.avatar_url,
        COALESCE(SUM(ph.points), 0) as total_points,
        RANK() OVER (ORDER BY COALESCE(SUM(ph.points), 0) DESC) as rank
    FROM
        profiles p
    LEFT JOIN
        points_history ph ON p.id = ph.user_id
        AND ph.created_at >= start_time
        AND ph.created_at <= end_time
    GROUP BY
        p.id, p.display_name, p.avatar_url
    ORDER BY
        total_points DESC;
END;
$$;
