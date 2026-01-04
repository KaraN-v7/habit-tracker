-- =================================================================
-- FINAL DB UPDATE: STREAKS & FIXED STATS (V3)
-- =================================================================

-- 1. PURGE ALL OLD POINT LOGIC (CRITICAL STEP)
-- =======================================================
-- Daily
DROP TRIGGER IF EXISTS trigger_daily_goal_points ON daily_goals;
DROP FUNCTION IF EXISTS handle_daily_goal_points();

-- Syllabus
DROP TRIGGER IF EXISTS trigger_syllabus_points ON chapters;
DROP FUNCTION IF EXISTS handle_syllabus_points();

-- Weekly/Monthly (In case they exist from previous attempts)
DROP TRIGGER IF EXISTS trigger_weekly_goal_points ON weekly_goal_completions;
DROP TRIGGER IF EXISTS trigger_monthly_goal_points ON monthly_goal_completions;
DROP TRIGGER IF EXISTS handle_weekly_goal_points ON weekly_goal_completions;
DROP TRIGGER IF EXISTS handle_monthly_goal_points ON monthly_goal_completions;


-- 2. RESET POINTS (Start Fresh)
-- =============================
TRUNCATE TABLE points_history;


-- 3. SETUP STREAK SYSTEM (The Only Source of Points)
-- ==================================================

-- Weekly Streak Function
CREATE OR REPLACE FUNCTION handle_weekly_streak_points() RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    is_streak_active BOOLEAN;
    goal_user_id UUID;
BEGIN
    SELECT user_id INTO goal_user_id FROM weekly_goals WHERE id = NEW.weekly_goal_id;

    -- IF COMPLETED
    IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
        -- Check Previous Day
        SELECT EXISTS (
            SELECT 1 FROM weekly_goal_completions
            WHERE weekly_goal_id = NEW.weekly_goal_id
            AND date = (NEW.date - INTERVAL '1 day')::DATE
            AND completed = true
        ) INTO is_streak_active;

        -- Award 2 points ONLY if streak is active
        IF is_streak_active THEN
            INSERT INTO points_history (user_id, points, source_type, source_id)
            VALUES (goal_user_id, 2, 'streak_weekly', NEW.id::text);
        END IF;

    -- IF UN-COMPLETED
    ELSIF NEW.completed = false AND OLD.completed = true THEN
        DELETE FROM points_history WHERE source_id = NEW.id::text AND source_type = 'streak_weekly';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Monthly Streak Function
CREATE OR REPLACE FUNCTION handle_monthly_streak_points() RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    is_streak_active BOOLEAN;
    goal_user_id UUID;
BEGIN
    SELECT user_id INTO goal_user_id FROM monthly_goals WHERE id = NEW.monthly_goal_id;

    -- IF COMPLETED
    IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
        -- Check Previous Day
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
        DELETE FROM points_history WHERE source_id = NEW.id::text AND source_type = 'streak_monthly';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply Streak Triggers
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


-- 4. FIX LEADERBOARD STATS (Aggregating Study Hours from All Sources)
-- ===================================================================
DROP FUNCTION IF EXISTS get_user_period_details(uuid, timestamptz, timestamptz);

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
    total_points BIGINT,
    longest_streak BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Goals: Daily + Weekly + Monthly completions in range
        (
         (SELECT COUNT(*) FROM daily_goals WHERE user_id = target_user_id AND date >= start_time::date AND date <= end_time::date AND completed = true)
         +
         (SELECT COUNT(*) FROM weekly_goal_completions wgc JOIN weekly_goals wg ON wgc.weekly_goal_id = wg.id WHERE wg.user_id = target_user_id AND wgc.date >= start_time::date AND wgc.date <= end_time::date AND wgc.completed = true)
         +
         (SELECT COUNT(*) FROM monthly_goal_completions mgc JOIN monthly_goals mg ON mgc.monthly_goal_id = mg.id WHERE mg.user_id = target_user_id AND mgc.date >= start_time::date AND mgc.date <= end_time::date AND mgc.completed = true)
        )::BIGINT as goals_completed,
        
        -- Chapters: Updated in range
        (SELECT COUNT(*) FROM chapters c JOIN subjects s ON c.subject_id = s.id WHERE s.user_id = target_user_id AND c.completed = true AND c.updated_at >= start_time AND c.updated_at <= end_time)::BIGINT as chapters_completed,
        
        -- Subjects: Updated in range
        (SELECT COUNT(*) FROM subjects s WHERE s.user_id = target_user_id AND s.updated_at >= start_time AND s.updated_at <= end_time)::BIGINT as subjects_completed,
        
        -- Study Hours: AGGREGATE FROM ALL SOURCES
        (
            -- 1. Daily Goals
            COALESCE(
                (SELECT SUM(
                    COALESCE(
                        CAST(substring(LOWER(content) from '(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)') AS NUMERIC),
                        0
                    )
                ) 
                FROM daily_goals 
                WHERE user_id = target_user_id 
                AND date >= start_time::date 
                AND date <= end_time::date
                AND completed = true),
                0
            )
            +
            -- 2. Weekly Goals (Check title for hours, multiply by number of completions in range)
            COALESCE(
                (SELECT SUM(
                    COALESCE(
                        CAST(substring(LOWER(wg.title) from '(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)') AS NUMERIC),
                        0
                    )
                )
                FROM weekly_goal_completions wgc
                JOIN weekly_goals wg ON wgc.weekly_goal_id = wg.id
                WHERE wg.user_id = target_user_id
                AND wgc.date >= start_time::date
                AND wgc.date <= end_time::date
                AND wgc.completed = true
                -- Ensure the title actually has hours
                AND wg.title ~* '(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)'),
                0
            )
            +
            -- 3. Monthly Goals (Check title for hours, multiply by number of completions in range)
            COALESCE(
                (SELECT SUM(
                    COALESCE(
                        CAST(substring(LOWER(mg.title) from '(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)') AS NUMERIC),
                        0
                    )
                )
                FROM monthly_goal_completions mgc
                JOIN monthly_goals mg ON mgc.monthly_goal_id = mg.id
                WHERE mg.user_id = target_user_id
                AND mgc.date >= start_time::date
                AND mgc.date <= end_time::date
                AND mgc.completed = true
                AND mg.title ~* '(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)'),
                0
            )
        ) as study_hours,
        
        -- Total Points: Sum from points_history in range (0 if null)
        COALESCE(
            (SELECT SUM(points) FROM points_history 
             WHERE user_id = target_user_id 
             AND created_at >= start_time 
             AND created_at <= end_time), 
            0
        )::BIGINT as total_points,

        -- Longest Streak: Max consecutive days for any weekly/monthly habit in range
        COALESCE(
            (
                WITH dates AS (
                    SELECT weekly_goal_id::text as id, date::date as d
                    FROM weekly_goal_completions wgc
                    JOIN weekly_goals wg ON wgc.weekly_goal_id = wg.id
                    WHERE wg.user_id = target_user_id
                    AND wgc.date >= start_time::date AND wgc.date <= end_time::date
                    AND wgc.completed = true
                    UNION ALL
                    SELECT monthly_goal_id::text as id, date::date as d
                    FROM monthly_goal_completions mgc
                    JOIN monthly_goals mg ON mgc.monthly_goal_id = mg.id
                    WHERE mg.user_id = target_user_id
                    AND mgc.date >= start_time::date AND mgc.date <= end_time::date
                    AND mgc.completed = true
                ),
                groups AS (
                    SELECT
                        id,
                        d,
                        d - (ROW_NUMBER() OVER (PARTITION BY id ORDER BY d))::integer AS grp
                    FROM dates
                ),
                streaks AS (
                    SELECT COUNT(*) as streak
                    FROM groups
                    GROUP BY id, grp
                )
                SELECT MAX(streak) FROM streaks
            ),
            0
        )::BIGINT as longest_streak;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_period_details(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_period_details(uuid, timestamptz, timestamptz) TO service_role;


-- 5. ENSURE LEADERBOARD LIST RPC EXISTS
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
