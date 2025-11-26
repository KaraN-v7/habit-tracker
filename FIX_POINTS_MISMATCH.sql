-- ============================================
-- COMPREHENSIVE POINTS DIAGNOSTIC & FIX
-- ============================================

-- STEP 1: See what points you currently have
SELECT 
    ph.source_type,
    ph.points,
    ph.source_id,
    ph.created_at,
    dg.content,
    dg.completed as current_status
FROM points_history ph
LEFT JOIN daily_goals dg ON dg.id::text = ph.source_id
WHERE ph.user_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
ORDER BY ph.created_at DESC;

-- STEP 2: Find mismatched points (points exist but goal is unchecked)
SELECT 
    'Mismatch Found' as status,
    ph.source_id,
    ph.points,
    dg.content,
    dg.completed as goal_status
FROM points_history ph
JOIN daily_goals dg ON dg.id::text = ph.source_id
WHERE ph.source_type = 'daily_goal'
AND dg.completed = false;

-- STEP 3: CLEAN UP MISMATCHED POINTS
-- This removes points for goals that are currently unchecked
DELETE FROM points_history
WHERE source_type IN ('daily_goal', 'study_hour')
AND source_id IN (
    SELECT ph.source_id
    FROM points_history ph
    LEFT JOIN daily_goals dg ON dg.id::text = REPLACE(ph.source_id, '_study', '')
    WHERE (dg.completed = false OR dg.completed IS NULL)
);

-- Also clean up study hour points
DELETE FROM points_history
WHERE source_type = 'study_hour'
AND REPLACE(source_id, '_study', '') IN (
    SELECT dg.id::text
    FROM daily_goals dg
    WHERE dg.completed = false
);

-- STEP 4: Verify points are now correct
SELECT 
    user_id,
    SUM(points) as total_points,
    COUNT(*) as point_entries
FROM points_history
GROUP BY user_id;

-- Check leaderboard
SELECT * FROM leaderboard_stats ORDER BY total_points DESC;

-- STEP 5: Test the trigger
-- Find today's goals
SELECT id, content, completed, date 
FROM daily_goals 
WHERE date = CURRENT_DATE 
AND user_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
LIMIT 3;

-- INSTRUCTIONS:
-- 1. Run this entire script
-- 2. Your points should now be 0 (or match your actual completed goals)
-- 3. Go to your app and check a goal for TODAY
-- 4. Come back and run this query to see if points were added:

/*
SELECT 
    source_type,
    points,
    created_at
FROM points_history
WHERE user_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
ORDER BY created_at DESC
LIMIT 5;
*/
