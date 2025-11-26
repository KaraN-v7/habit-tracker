-- ============================================
-- MASTER RESET & RECALCULATE POINTS
-- ============================================
-- This script will completely wipe the points history and rebuild it 
-- from scratch based on the CURRENT status of all your goals.
-- If everything is unchecked, this will result in 0 points.

BEGIN;

-- 1. Wipe all points
DELETE FROM points_history;

-- 2. Recalculate Daily Goal Points
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    user_id,
    2,
    'daily_goal',
    id::text,
    updated_at
FROM daily_goals
WHERE completed = true;

-- 2b. Recalculate Daily Goal Study Hours
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

-- 3. Recalculate Weekly Goal Points
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    wg.user_id,
    2,
    'weekly_goal_completion',
    wgc.id::text,
    wgc.date::timestamp
FROM weekly_goal_completions wgc
JOIN weekly_goals wg ON wgc.weekly_goal_id = wg.id
WHERE wgc.completed = true;

-- 3b. Recalculate Weekly Goal Study Hours
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    wg.user_id,
    FLOOR(
        (regexp_matches(LOWER(wg.title), '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)'))[1]::NUMERIC * 10
    )::INTEGER,
    'study_hour',
    wgc.id::text || '_study',
    wgc.date::timestamp
FROM weekly_goal_completions wgc
JOIN weekly_goals wg ON wgc.weekly_goal_id = wg.id
WHERE wgc.completed = true
AND LOWER(wg.title) ~ '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)';

-- 4. Recalculate Monthly Goal Points
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    mg.user_id,
    2,
    'monthly_goal_completion',
    mgc.id::text,
    mgc.date::timestamp
FROM monthly_goal_completions mgc
JOIN monthly_goals mg ON mgc.monthly_goal_id = mg.id
WHERE mgc.completed = true;

-- 4b. Recalculate Monthly Goal Study Hours
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    mg.user_id,
    FLOOR(
        (regexp_matches(LOWER(mg.title), '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)'))[1]::NUMERIC * 10
    )::INTEGER,
    'study_hour',
    mgc.id::text || '_study',
    mgc.date::timestamp
FROM monthly_goal_completions mgc
JOIN monthly_goals mg ON mgc.monthly_goal_id = mg.id
WHERE mgc.completed = true
AND LOWER(mg.title) ~ '(\d+(\.\d+)?)\s*(?:hours?|hrs?|h)';

-- 5. Recalculate Chapter Points (Syllabus)
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

-- 6. Recalculate Subject Completion Points
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    s.user_id,
    20,
    'subject',
    s.id::text,
    s.updated_at
FROM subjects s
WHERE EXISTS (SELECT 1 FROM chapters c WHERE c.subject_id = s.id)
AND NOT EXISTS (SELECT 1 FROM chapters c WHERE c.subject_id = s.id AND c.completed = false);

-- 7. Recalculate Full Syllabus Bonus
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    u.id,
    100,
    'full_syllabus',
    'complete',
    NOW()
FROM auth.users u
WHERE EXISTS (SELECT 1 FROM subjects s WHERE s.user_id = u.id)
AND NOT EXISTS (
    SELECT 1 FROM subjects s 
    WHERE s.user_id = u.id 
    AND EXISTS (SELECT 1 FROM chapters c WHERE c.subject_id = s.id AND c.completed = false)
);

COMMIT;

-- Verify result
SELECT * FROM leaderboard_stats;
