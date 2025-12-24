-- ============================================
-- FIX POINTS DATE ASSIGNMENT (V3 - FINAL ROBUST)
-- ============================================

-- 1. DROP EVERYTHING RELATED TO POINTS TRIGGERS
DROP TRIGGER IF EXISTS trigger_daily_goal_points ON daily_goals;
DROP TRIGGER IF EXISTS trigger_enforce_date_daily ON daily_goals;
DROP TRIGGER IF EXISTS trigger_enforce_date_weekly ON weekly_goal_completions;
DROP TRIGGER IF EXISTS trigger_enforce_date_monthly ON monthly_goal_completions;
DROP FUNCTION IF EXISTS enforce_current_date_edit();
DROP FUNCTION IF EXISTS handle_daily_goal_points();

-- 2. CREATE A ROBUST POINTS HANDLER
-- This function will handle INSERT, UPDATE, and DELETE to ensure points stay in sync
-- even if the app deletes/re-inserts goals (which it does for 'saveGoals').
CREATE OR REPLACE FUNCTION handle_daily_goal_points() RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    study_hours NUMERIC;
    matches TEXT[];
    goal_date TIMESTAMP WITH TIME ZONE;
    op TEXT;
BEGIN
    -- Determine Operation
    op := TG_OP;

    -- For DELETE, we only need to remove points
    IF op = 'DELETE' THEN
        DELETE FROM points_history WHERE source_id = OLD.id::text AND source_type = 'daily_goal';
        DELETE FROM points_history WHERE source_id = OLD.id::text || '_study' AND source_type = 'study_hour';
        RETURN OLD;
    END IF;

    -- For INSERT or UPDATE, we calculate points
    
    -- Extract study hours
    SELECT regexp_matches(LOWER(NEW.content), '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)') INTO matches;
    IF matches IS NOT NULL AND array_length(matches, 1) > 0 THEN
        study_hours := matches[1]::NUMERIC;
    ELSE
        study_hours := 0;
    END IF;

    -- CRITICAL: Use the goal's DATE for the point timestamp
    goal_date := (NEW.date::TIMESTAMP + interval '12 hours');

    -- If the goal is COMPLETED, ensure points exist
    IF NEW.completed = true THEN
        -- 1. Goal Points (+2)
        -- Upsert logic: Delete existing to avoid duplicates/stale data, then Insert
        DELETE FROM points_history WHERE source_id = NEW.id::text AND source_type = 'daily_goal';
        
        INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
        VALUES (NEW.user_id, 2, 'daily_goal', NEW.id::text, goal_date);
        
        -- 2. Study Points
        DELETE FROM points_history WHERE source_id = NEW.id::text || '_study' AND source_type = 'study_hour';
        
        IF study_hours > 0 THEN
             INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
             VALUES (NEW.user_id, floor(study_hours * 10)::INTEGER, 'study_hour', NEW.id::text || '_study', goal_date);
        END IF;

    -- If goal is NOT COMPLETED, ensure points are removed
    ELSE
        DELETE FROM points_history WHERE source_id = NEW.id::text AND source_type = 'daily_goal';
        DELETE FROM points_history WHERE source_id = NEW.id::text || '_study' AND source_type = 'study_hour';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. APPLY TRIGGER TO ALL OPERATIONS
CREATE TRIGGER trigger_daily_goal_points
AFTER INSERT OR UPDATE OR DELETE ON daily_goals
FOR EACH ROW
EXECUTE FUNCTION handle_daily_goal_points();

-- 4. NUCLEAR RESET OF POINTS HISTORY
-- We wipe the history clean and rebuild it from current daily_goals
-- This ensures that any "ghost points" or "wrong date points" are completely eliminated.

-- 4.1. Clear Daily Goal points only (Keep manual points or other sources if they exist? 
--      Actually, let's just clean daily_goal and study_hour types to be safe)
DELETE FROM points_history WHERE source_type IN ('daily_goal', 'study_hour');

-- 4.2. Re-populate from current data
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    user_id,
    2,
    'daily_goal',
    id::text,
    (date::TIMESTAMP + interval '12 hours')
FROM daily_goals
WHERE completed = true;

INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    user_id,
    FLOOR((regexp_matches(LOWER(content), '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)'))[1]::NUMERIC * 10)::INTEGER,
    'study_hour',
    id::text || '_study',
    (date::TIMESTAMP + interval '12 hours')
FROM daily_goals
WHERE completed = true
AND LOWER(content) ~ '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)';

-- 5. VERIFY
-- This query is just for you to check if points are backfilled correctly
SELECT count(*) as total_points_entries FROM points_history;
