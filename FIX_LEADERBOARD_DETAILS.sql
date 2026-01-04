-- =================================================================
-- FIX LEADERBOARD DETAILS & LIVE UPDATES
-- =================================================================

-- 1. FIX DETAILS FUNCTION
-- The previous version depended on points_history accumulating rows.
-- If a user had 0 points (common with streak system), the function returned NO ROWS.
-- We fix this by removing the main FROM clause and using independent subqueries.

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
        -- 1. Goals Completed (Count from source tables directly)
        (
         (SELECT COUNT(*) FROM daily_goals WHERE user_id = target_user_id AND date >= start_time::date AND date <= end_time::date AND completed = true)
         +
         (SELECT COUNT(*) FROM weekly_goal_completions wgc JOIN weekly_goals wg ON wgc.weekly_goal_id = wg.id WHERE wg.user_id = target_user_id AND wgc.date >= start_time::date AND wgc.date <= end_time::date AND wgc.completed = true)
         +
         (SELECT COUNT(*) FROM monthly_goal_completions mgc JOIN monthly_goals mg ON mgc.monthly_goal_id = mg.id WHERE mg.user_id = target_user_id AND mgc.date >= start_time::date AND mgc.date <= end_time::date AND mgc.completed = true)
        )::BIGINT as goals_completed,
        
        -- 2. Chapters Completed (All time referenced in period? User probably wants total actually, but let's stick to period-modified for this specific chart if requested, otherwise usually profile shows ALL time. 
        -- The previous logic filtered by update time. Let's keep that for the "Period Stats" box.)
        (SELECT COUNT(*) FROM chapters c JOIN subjects s ON c.subject_id = s.id WHERE s.user_id = target_user_id AND c.completed = true AND c.updated_at >= start_time AND c.updated_at <= end_time)::BIGINT as chapters_completed,
        
        -- 3. Subjects Completed
        (SELECT COUNT(*) FROM subjects s WHERE s.user_id = target_user_id AND s.updated_at >= start_time AND s.updated_at <= end_time)::BIGINT as subjects_completed,
        
        -- 4. Study Hours (From Daily Goals)
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
        
        -- 5. Total Points (Streak)
        COALESCE(
            (SELECT SUM(points) FROM points_history 
             WHERE user_id = target_user_id 
             AND created_at >= start_time 
             AND created_at <= end_time), 
            0
        )::BIGINT as total_points;
END;
$$;
