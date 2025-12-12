-- ==========================================
-- FIX RESET AND TRIGGER BUGS
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Fix Trigger to allow undoing/resetting past days
-- Previously, this blocked resetting because it thought you were editing past history.
CREATE OR REPLACE FUNCTION enforce_current_date_edit() RETURNS TRIGGER AS $$
BEGIN
    -- Allow Admins
    IF is_admin() THEN RETURN NEW; END IF;

    -- Allow UNCHECKING (setting completed = false) on any date
    -- This allows "Reset" functionality and fixing mistakes
    IF TG_OP = 'UPDATE' AND NEW.completed = false AND OLD.completed = true THEN
        RETURN NEW;
    END IF;

    -- Check if the date of the goal is NOT today (cast to date to be safe)
    IF NEW.date::DATE != CURRENT_DATE THEN
        RAISE EXCEPTION 'You can only edit goals for the current date (Today).';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix Reset Function to handle date comparisons safely and securely
CREATE OR REPLACE FUNCTION reset_my_progress(period text) RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_user UUID := auth.uid();
    start_date DATE;
BEGIN
    IF period = 'today' THEN
        start_date := CURRENT_DATE;
    ELSIF period = 'week' THEN
        -- Reset from start of week
        start_date := date_trunc('week', CURRENT_DATE)::DATE;
    ELSIF period = 'month' THEN
        -- Reset from start of month
        start_date := date_trunc('month', CURRENT_DATE)::DATE;
    ELSE
        RAISE EXCEPTION 'Invalid period.';
    END IF;

    -- 1. Uncheck Daily Goals (Cast date to ensure comparison works)
    UPDATE daily_goals
    SET completed = false
    WHERE user_id = target_user
    AND date::DATE >= start_date;

    -- 2. Uncheck Weekly Goal Completions
    DELETE FROM weekly_goal_completions wgc
    USING weekly_goals wg
    WHERE wgc.weekly_goal_id = wg.id
    AND wg.user_id = target_user
    AND wgc.date::DATE >= start_date;

    -- 3. Uncheck Monthly Goal Completions
    DELETE FROM monthly_goal_completions mgc
    USING monthly_goals mg
    WHERE mgc.monthly_goal_id = mg.id
    AND mg.user_id = target_user
    AND mgc.date::DATE >= start_date;
END;
$$ LANGUAGE plpgsql;
