-- ============================================
-- FIX POINTS DATE ASSIGNMENT (V2 - FIXED DEPENDENCIES)
-- ============================================
-- This script ensures that when a goal is completed for a past date,
-- the points are awarded for THAT date, not "today".

-- 1. DROP RESTRICTIVE TRIGGERS
-- We must drop ALL triggers that depend on the function before dropping the function itself.
DROP TRIGGER IF EXISTS trigger_enforce_date_daily ON daily_goals;
DROP TRIGGER IF EXISTS trigger_enforce_date_weekly ON weekly_goal_completions;
DROP TRIGGER IF EXISTS trigger_enforce_date_monthly ON monthly_goal_completions;

-- Now it is safe to drop the function
DROP FUNCTION IF EXISTS enforce_current_date_edit();

-- 2. UPDATE DAILY GOAL POINTS TRIGGER
-- Modify the function to use the goal's 'date' for the points timestamp
CREATE OR REPLACE FUNCTION handle_daily_goal_points() RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    study_hours NUMERIC;
    matches TEXT[];
    goal_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Attempt to extract study hours using regex
    SELECT regexp_matches(LOWER(NEW.content), '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)') INTO matches;
    
    IF matches IS NOT NULL AND array_length(matches, 1) > 0 THEN
        study_hours := matches[1]::NUMERIC;
    ELSE
        study_hours := 0;
    END IF;

    -- Use the goal's date for the points history timestamp.
    -- We add 12 hours to place it in the middle of the day (noon).
    goal_date := (NEW.date::TIMESTAMP + interval '12 hours');

    -- IF COMPLETED
    IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
        -- Add Goal Points (+2)
        INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
        VALUES (NEW.user_id, 2, 'daily_goal', NEW.id::text, goal_date);
        
        -- Add Study Points (+10 per hour)
        IF study_hours > 0 THEN
             INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
             VALUES (NEW.user_id, floor(study_hours * 10)::INTEGER, 'study_hour', NEW.id::text || '_study', goal_date);
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

-- Re-create the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS trigger_daily_goal_points ON daily_goals;
CREATE TRIGGER trigger_daily_goal_points
AFTER UPDATE OF completed ON daily_goals
FOR EACH ROW
EXECUTE FUNCTION handle_daily_goal_points();


-- 3. FIX EXISTING POINTS HISTORY
-- Update existing points records to match the date of their source goal
UPDATE points_history ph
SET created_at = (dg.date::TIMESTAMP + interval '12 hours')
FROM daily_goals dg
WHERE ph.source_id = dg.id::text 
AND ph.source_type = 'daily_goal';

UPDATE points_history ph
SET created_at = (dg.date::TIMESTAMP + interval '12 hours')
FROM daily_goals dg
WHERE ph.source_id = dg.id::text || '_study'
AND ph.source_type = 'study_hour';
