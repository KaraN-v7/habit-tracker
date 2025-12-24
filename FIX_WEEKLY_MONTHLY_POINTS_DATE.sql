-- ============================================
-- FIX WEEKLY & MONTHLY POINTS DATE ASSIGNMENT
-- ============================================
-- The previous points assignment script was using NOW() for weekly and monthly goals.
-- This script updates the triggers to use the completion DATE (NEW.date).
-- It also fixes existing history for these goal types.

-- 1. FIX WEEKLY GOAL TRIGGER
CREATE OR REPLACE FUNCTION handle_weekly_goal_points() RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    goal_title TEXT;
    goal_user_id UUID;
    study_hours NUMERIC;
    matches TEXT[];
    goal_date TIMESTAMP WITH TIME ZONE;
    op TEXT;
BEGIN
    op := TG_OP;

    -- For DELETE, we only need to remove points
    IF op = 'DELETE' THEN
        DELETE FROM points_history WHERE source_id = OLD.id::text AND source_type = 'weekly_goal_completion';
        DELETE FROM points_history WHERE source_id = OLD.id::text || '_study' AND source_type = 'study_hour';
        RETURN OLD;
    END IF;

    -- Get title and user_id from parent table
    SELECT title, user_id INTO goal_title, goal_user_id
    FROM weekly_goals
    WHERE id = NEW.weekly_goal_id;

    -- Attempt to extract study hours using regex
    SELECT regexp_matches(LOWER(goal_title), '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)') INTO matches;
    
    IF matches IS NOT NULL AND array_length(matches, 1) > 0 THEN
        study_hours := matches[1]::NUMERIC;
    ELSE
        study_hours := 0;
    END IF;

    -- USE THE GOAL DATE (+12 hours for noon)
    goal_date := (NEW.date::TIMESTAMP + interval '12 hours');

    -- IF COMPLETED (For INSERT or UPDATE)
    IF NEW.completed = true THEN
        -- Cleanup first (Upsert pattern)
        DELETE FROM points_history WHERE source_id = NEW.id::text AND source_type = 'weekly_goal_completion';
        DELETE FROM points_history WHERE source_id = NEW.id::text || '_study' AND source_type = 'study_hour';

        -- Add Goal Points (+2)
        INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
        VALUES (goal_user_id, 2, 'weekly_goal_completion', NEW.id::text, goal_date);
        
        -- Add Study Points (+10 per hour)
        IF study_hours > 0 THEN
             INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
             VALUES (goal_user_id, floor(study_hours * 10)::INTEGER, 'study_hour', NEW.id::text || '_study', goal_date);
        END IF;
        
    -- IF UN-COMPLETED
    ELSE
        -- Remove Goal Points
        DELETE FROM points_history WHERE source_id = NEW.id::text AND source_type = 'weekly_goal_completion';
        DELETE FROM points_history WHERE source_id = NEW.id::text || '_study' AND source_type = 'study_hour';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply robust trigger (Insert/Update/Delete)
DROP TRIGGER IF EXISTS trigger_weekly_goal_points ON weekly_goal_completions;
CREATE TRIGGER trigger_weekly_goal_points
AFTER INSERT OR UPDATE OR DELETE ON weekly_goal_completions
FOR EACH ROW
EXECUTE FUNCTION handle_weekly_goal_points();


-- 2. FIX MONTHLY GOAL TRIGGER
CREATE OR REPLACE FUNCTION handle_monthly_goal_points() RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    goal_title TEXT;
    goal_user_id UUID;
    study_hours NUMERIC;
    matches TEXT[];
    goal_date TIMESTAMP WITH TIME ZONE;
    op TEXT;
BEGIN
    op := TG_OP;

    -- For DELETE
    IF op = 'DELETE' THEN
        DELETE FROM points_history WHERE source_id = OLD.id::text AND source_type = 'monthly_goal_completion';
        DELETE FROM points_history WHERE source_id = OLD.id::text || '_study' AND source_type = 'study_hour';
        RETURN OLD;
    END IF;

    -- Get title and user_id from parent table
    SELECT title, user_id INTO goal_title, goal_user_id
    FROM monthly_goals
    WHERE id = NEW.monthly_goal_id;

    -- Attempt to extract study hours using regex
    SELECT regexp_matches(LOWER(goal_title), '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)') INTO matches;
    
    IF matches IS NOT NULL AND array_length(matches, 1) > 0 THEN
        study_hours := matches[1]::NUMERIC;
    ELSE
        study_hours := 0;
    END IF;

    -- USE THE GOAL DATE (+12 hours for noon)
    goal_date := (NEW.date::TIMESTAMP + interval '12 hours');

    -- IF COMPLETED
    IF NEW.completed = true THEN
         -- Cleanup first
        DELETE FROM points_history WHERE source_id = NEW.id::text AND source_type = 'monthly_goal_completion';
        DELETE FROM points_history WHERE source_id = NEW.id::text || '_study' AND source_type = 'study_hour';

        -- Add Goal Points (+2)
        INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
        VALUES (goal_user_id, 2, 'monthly_goal_completion', NEW.id::text, goal_date);
        
        -- Add Study Points (+10 per hour)
        IF study_hours > 0 THEN
             INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
             VALUES (goal_user_id, floor(study_hours * 10)::INTEGER, 'study_hour', NEW.id::text || '_study', goal_date);
        END IF;

    -- IF UN-COMPLETED
    ELSE
        -- Remove Goal Points
        DELETE FROM points_history WHERE source_id = NEW.id::text AND source_type = 'monthly_goal_completion';
        DELETE FROM points_history WHERE source_id = NEW.id::text || '_study' AND source_type = 'study_hour';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply robust trigger
DROP TRIGGER IF EXISTS trigger_monthly_goal_points ON monthly_goal_completions;
CREATE TRIGGER trigger_monthly_goal_points
AFTER INSERT OR UPDATE OR DELETE ON monthly_goal_completions
FOR EACH ROW
EXECUTE FUNCTION handle_monthly_goal_points();


-- 3. FIX EXISTING HISTORY FOR WEEKLY & MONTHLY
-- Update the creation date of existing points to match their goal dates

-- Fix Weekly Points
UPDATE points_history ph
SET created_at = (wgc.date::TIMESTAMP + interval '12 hours')
FROM weekly_goal_completions wgc
WHERE ph.source_id = wgc.id::text 
AND ph.source_type = 'weekly_goal_completion';

UPDATE points_history ph
SET created_at = (wgc.date::TIMESTAMP + interval '12 hours')
FROM weekly_goal_completions wgc
WHERE ph.source_id = wgc.id::text || '_study'
AND ph.source_type = 'study_hour';

-- Fix Monthly Points
UPDATE points_history ph
SET created_at = (mgc.date::TIMESTAMP + interval '12 hours')
FROM monthly_goal_completions mgc
WHERE ph.source_id = mgc.id::text 
AND ph.source_type = 'monthly_goal_completion';

UPDATE points_history ph
SET created_at = (mgc.date::TIMESTAMP + interval '12 hours')
FROM monthly_goal_completions mgc
WHERE ph.source_id = mgc.id::text || '_study'
AND ph.source_type = 'study_hour';
