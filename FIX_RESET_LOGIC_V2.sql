-- ==========================================
-- FIX RESET LOGIC V2: FORCE DELETE POINTS
-- Run this in Supabase SQL Editor
-- ==========================================

CREATE OR REPLACE FUNCTION reset_my_progress(period text) RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_user UUID := auth.uid();
    start_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Determine the start time for the reset
    IF period = 'today' THEN
        start_timestamp := CURRENT_DATE;
    ELSIF period = 'week' THEN
        start_timestamp := date_trunc('week', CURRENT_DATE);
    ELSIF period = 'month' THEN
        start_timestamp := date_trunc('month', CURRENT_DATE);
    ELSE
        RAISE EXCEPTION 'Invalid period.';
    END IF;

    -- 1. FORCE DELETE points from history for this period
    -- This ensures points are gone even if the goal triggers fail or don't match.
    DELETE FROM points_history
    WHERE user_id = target_user
    AND created_at >= start_timestamp;

    -- 2. Uncheck Daily Goals (Visual Reset)
    UPDATE daily_goals
    SET completed = false
    WHERE user_id = target_user
    AND date::DATE >= start_timestamp::DATE;

    -- 3. Uncheck Weekly Goal Completions (Visual Reset)
    DELETE FROM weekly_goal_completions wgc
    USING weekly_goals wg
    WHERE wgc.weekly_goal_id = wg.id
    AND wg.user_id = target_user
    AND wgc.date::DATE >= start_timestamp::DATE;

    -- 4. Uncheck Monthly Goal Completions (Visual Reset)
    DELETE FROM monthly_goal_completions mgc
    USING monthly_goals mg
    WHERE mgc.monthly_goal_id = mg.id
    AND mg.user_id = target_user
    AND mgc.date::DATE >= start_timestamp::DATE;

END;
$$ LANGUAGE plpgsql;
