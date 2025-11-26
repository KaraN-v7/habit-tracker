-- ============================================
-- ADD POINTS FOR WEEKLY AND MONTHLY GOALS
-- ============================================

-- 1. TRIGGER FOR WEEKLY GOALS
CREATE OR REPLACE FUNCTION handle_weekly_goal_points() RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    goal_title TEXT;
    goal_user_id UUID;
    study_hours NUMERIC;
    matches TEXT[];
BEGIN
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

    -- IF COMPLETED
    IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
        -- Add Goal Points (+2)
        INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
        VALUES (goal_user_id, 2, 'weekly_goal_completion', NEW.id::text, NOW());
        
        -- Add Study Points (+10 per hour)
        IF study_hours > 0 THEN
             INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
             VALUES (goal_user_id, floor(study_hours * 10)::INTEGER, 'study_hour', NEW.id::text || '_study', NOW());
        END IF;
        
    -- IF UN-COMPLETED
    ELSIF NEW.completed = false AND OLD.completed = true THEN
        -- Remove Goal Points
        DELETE FROM points_history WHERE source_id = NEW.id::text AND source_type = 'weekly_goal_completion';
        
        -- Remove Study Points
        DELETE FROM points_history WHERE source_id = NEW.id::text || '_study' AND source_type = 'study_hour';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_weekly_goal_points ON weekly_goal_completions;
CREATE TRIGGER trigger_weekly_goal_points
AFTER INSERT OR UPDATE OF completed ON weekly_goal_completions
FOR EACH ROW
EXECUTE FUNCTION handle_weekly_goal_points();


-- 2. TRIGGER FOR MONTHLY GOALS
CREATE OR REPLACE FUNCTION handle_monthly_goal_points() RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    goal_title TEXT;
    goal_user_id UUID;
    study_hours NUMERIC;
    matches TEXT[];
BEGIN
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

    -- IF COMPLETED
    IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
        -- Add Goal Points (+2)
        INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
        VALUES (goal_user_id, 2, 'monthly_goal_completion', NEW.id::text, NOW());
        
        -- Add Study Points (+10 per hour)
        IF study_hours > 0 THEN
             INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
             VALUES (goal_user_id, floor(study_hours * 10)::INTEGER, 'study_hour', NEW.id::text || '_study', NOW());
        END IF;
        
    -- IF UN-COMPLETED
    ELSIF NEW.completed = false AND OLD.completed = true THEN
        -- Remove Goal Points
        DELETE FROM points_history WHERE source_id = NEW.id::text AND source_type = 'monthly_goal_completion';
        
        -- Remove Study Points
        DELETE FROM points_history WHERE source_id = NEW.id::text || '_study' AND source_type = 'study_hour';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_monthly_goal_points ON monthly_goal_completions;
CREATE TRIGGER trigger_monthly_goal_points
AFTER INSERT OR UPDATE OF completed ON monthly_goal_completions
FOR EACH ROW
EXECUTE FUNCTION handle_monthly_goal_points();


-- 3. BACKFILL EXISTING COMPLETED WEEKLY/MONTHLY GOALS
-- (This ensures points are added for what is ALREADY checked)

-- Backfill Weekly
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    wg.user_id,
    2,
    'weekly_goal_completion',
    wgc.id::text,
    NOW()
FROM weekly_goal_completions wgc
JOIN weekly_goals wg ON wgc.weekly_goal_id = wg.id
WHERE wgc.completed = true
ON CONFLICT DO NOTHING;

INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    wg.user_id,
    FLOOR(
        (regexp_matches(LOWER(wg.title), '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)'))[1]::NUMERIC * 10
    )::INTEGER,
    'study_hour',
    wgc.id::text || '_study',
    NOW()
FROM weekly_goal_completions wgc
JOIN weekly_goals wg ON wgc.weekly_goal_id = wg.id
WHERE wgc.completed = true
AND LOWER(wg.title) ~ '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)'
ON CONFLICT DO NOTHING;


-- Backfill Monthly
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    mg.user_id,
    2,
    'monthly_goal_completion',
    mgc.id::text,
    NOW()
FROM monthly_goal_completions mgc
JOIN monthly_goals mg ON mgc.monthly_goal_id = mg.id
WHERE mgc.completed = true
ON CONFLICT DO NOTHING;

INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    mg.user_id,
    FLOOR(
        (regexp_matches(LOWER(mg.title), '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)'))[1]::NUMERIC * 10
    )::INTEGER,
    'study_hour',
    mgc.id::text || '_study',
    NOW()
FROM monthly_goal_completions mgc
JOIN monthly_goals mg ON mgc.monthly_goal_id = mg.id
WHERE mgc.completed = true
AND LOWER(mg.title) ~ '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)'
ON CONFLICT DO NOTHING;
