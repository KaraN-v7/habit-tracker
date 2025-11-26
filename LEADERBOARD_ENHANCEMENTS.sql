-- ============================================
-- LEADERBOARD ENHANCEMENTS (Dynamic Periods & Details)
-- ============================================

-- 1. Function to get leaderboard for ANY date range
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

-- 2. Function to get detailed stats for a specific user in a range
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
        COUNT(*) FILTER (WHERE source_type IN ('daily_goal', 'weekly_goal_completion', 'monthly_goal_completion')) as goals_completed,
        COUNT(*) FILTER (WHERE source_type = 'chapter') as chapters_completed,
        COUNT(*) FILTER (WHERE source_type = 'subject') as subjects_completed,
        -- Points are 10 per hour, so divide by 10 to get hours back
        COALESCE(SUM(points) FILTER (WHERE source_type = 'study_hour'), 0) / 10.0 as study_hours,
        COALESCE(SUM(points), 0) as total_points
    FROM
        points_history
    WHERE
        user_id = target_user_id
        AND created_at >= start_time
        AND created_at <= end_time;
END;
$$;

-- 3. Function to get current syllabus progress (All Time)
CREATE OR REPLACE FUNCTION get_user_syllabus_progress(target_user_id UUID)
RETURNS TABLE (
    total_chapters BIGINT,
    completed_chapters BIGINT,
    percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH user_subjects AS (
        SELECT id FROM subjects WHERE user_id = target_user_id
    )
    SELECT
        COUNT(c.id) as total_chapters,
        COUNT(c.id) FILTER (WHERE c.completed = true) as completed_chapters,
        CASE
            WHEN COUNT(c.id) > 0 THEN ROUND((COUNT(c.id) FILTER (WHERE c.completed = true)::NUMERIC / COUNT(c.id)::NUMERIC) * 100, 1)
            ELSE 0
        END as percentage
    FROM
        chapters c
    WHERE
        c.subject_id IN (SELECT id FROM user_subjects);
END;
$$;
