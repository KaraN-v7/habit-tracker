-- ============================================
-- SYNC POINTS AND FIX TRIGGERS
-- ============================================
-- This script will:
-- 1. Restore the triggers for points calculation (Daily Goals & Syllabus).
-- 2. Clear the points_history table (to remove stale/incorrect points).
-- 3. Recalculate all points based on the CURRENT state of your goals and syllabus.

-- ============================================
-- 1. RESTORE TRIGGERS
-- ============================================

-- 1.1 Daily Goal Points Trigger
CREATE OR REPLACE FUNCTION handle_daily_goal_points() RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    study_hours NUMERIC;
    matches TEXT[];
BEGIN
    -- Attempt to extract study hours using regex
    SELECT regexp_matches(LOWER(NEW.content), '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)') INTO matches;
    
    IF matches IS NOT NULL AND array_length(matches, 1) > 0 THEN
        study_hours := matches[1]::NUMERIC;
    ELSE
        study_hours := 0;
    END IF;

    -- IF COMPLETED
    IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
        -- Add Goal Points (+2)
        INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
        VALUES (NEW.user_id, 2, 'daily_goal', NEW.id::text, NEW.updated_at);
        
        -- Add Study Points (+10 per hour)
        IF study_hours > 0 THEN
             INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
             VALUES (NEW.user_id, floor(study_hours * 10)::INTEGER, 'study_hour', NEW.id::text || '_study', NEW.updated_at);
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

DROP TRIGGER IF EXISTS trigger_daily_goal_points ON daily_goals;
CREATE TRIGGER trigger_daily_goal_points
AFTER UPDATE OF completed ON daily_goals
FOR EACH ROW
EXECUTE FUNCTION handle_daily_goal_points();


-- 1.2 Syllabus Points Trigger
CREATE OR REPLACE FUNCTION handle_syllabus_points() RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    subject_completed BOOLEAN;
    total_chapters INTEGER;
    completed_chapters INTEGER;
    current_user_id UUID;
    all_subjects_complete BOOLEAN;
BEGIN
    -- Get the user_id for this chapter
    SELECT user_id INTO current_user_id FROM subjects WHERE id = NEW.subject_id;
    
    -- IF CHAPTER COMPLETED
    IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
        -- Add Chapter Points (+10)
        INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
        VALUES (current_user_id, 10, 'chapter', NEW.id::text, NEW.updated_at);
        
        -- CHECK FOR SUBJECT COMPLETION
        SELECT count(*), count(*) FILTER (WHERE completed = true)
        INTO total_chapters, completed_chapters
        FROM chapters
        WHERE subject_id = NEW.subject_id;
        
        -- If all chapters in this subject are now completed
        IF total_chapters > 0 AND total_chapters = completed_chapters THEN
             INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
             VALUES (current_user_id, 20, 'subject', NEW.subject_id::text, NEW.updated_at);
             
             -- CHECK FOR FULL SYLLABUS COMPLETION (all subjects complete)
             SELECT NOT EXISTS (
                 SELECT 1 
                 FROM subjects s
                 WHERE s.user_id = current_user_id
                 AND EXISTS (
                     SELECT 1 FROM chapters c 
                     WHERE c.subject_id = s.id 
                     AND c.completed = false
                 )
             ) INTO all_subjects_complete;
             
             -- If ALL subjects are now complete, award FULL SYLLABUS BONUS (+100)
             IF all_subjects_complete THEN
                 -- Check if bonus hasn't been awarded yet
                 IF NOT EXISTS (
                     SELECT 1 FROM points_history 
                     WHERE user_id = current_user_id 
                     AND source_type = 'full_syllabus'
                 ) THEN
                     INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
                     VALUES (current_user_id, 100, 'full_syllabus', 'complete', NOW());
                 END IF;
             END IF;
        END IF;

    -- IF CHAPTER UN-COMPLETED
    ELSIF NEW.completed = false AND OLD.completed = true THEN
        -- Remove Chapter Points
        DELETE FROM points_history WHERE source_id = NEW.id::text AND source_type = 'chapter';
        
        -- Remove Subject Points (if it was completed)
        DELETE FROM points_history WHERE source_id = NEW.subject_id::text AND source_type = 'subject';
        
        -- Remove Full Syllabus Bonus (if it was earned)
        DELETE FROM points_history WHERE user_id = current_user_id AND source_type = 'full_syllabus';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_syllabus_points ON chapters;
CREATE TRIGGER trigger_syllabus_points
AFTER UPDATE OF completed ON chapters
FOR EACH ROW
EXECUTE FUNCTION handle_syllabus_points();

-- ============================================
-- 2. RECALCULATE POINTS
-- ============================================

-- 2.1 Clear existing points
DELETE FROM points_history;

-- 2.2 Re-insert Daily Goal Points (+2)
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    user_id,
    2,
    'daily_goal',
    id::text,
    updated_at
FROM daily_goals
WHERE completed = true;

-- 2.3 Re-insert Study Hour Points (+10/hr)
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    user_id,
    FLOOR(
        (regexp_matches(LOWER(content), '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)'))[1]::NUMERIC * 10
    )::INTEGER,
    'study_hour',
    id::text || '_study',
    updated_at
FROM daily_goals
WHERE completed = true
AND LOWER(content) ~ '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)';

-- 2.4 Re-insert Chapter Points (+10)
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    s.user_id,
    10,
    'chapter',
    c.id::text,
    c.updated_at
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
WHERE c.completed = true;

-- 2.5 Re-insert Subject Points (+20)
-- (Only if all chapters are completed)
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    s.user_id,
    20,
    'subject',
    s.id::text,
    s.updated_at
FROM subjects s
WHERE EXISTS (SELECT 1 FROM chapters c WHERE c.subject_id = s.id) -- Must have chapters
AND NOT EXISTS (SELECT 1 FROM chapters c WHERE c.subject_id = s.id AND c.completed = false); -- No uncompleted chapters

-- 2.6 Re-insert Full Syllabus Bonus (+100)
-- (Only if ALL subjects are completed)
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    u.id,
    100,
    'full_syllabus',
    'complete',
    NOW()
FROM auth.users u
WHERE EXISTS (SELECT 1 FROM subjects s WHERE s.user_id = u.id) -- Must have subjects
AND NOT EXISTS (
    SELECT 1 FROM subjects s 
    WHERE s.user_id = u.id 
    AND EXISTS (SELECT 1 FROM chapters c WHERE c.subject_id = s.id AND c.completed = false)
);

-- ============================================
-- 3. VERIFY
-- ============================================
SELECT * FROM leaderboard_stats;
