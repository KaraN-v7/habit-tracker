-- ============================================
-- RESET POINTS AND TEST TRIGGERS
-- ============================================

-- STEP 1: Clear all existing points_history
-- This will reset everyone's points to 0
DELETE FROM points_history;

-- Verify points are cleared
SELECT COUNT(*) as remaining_points FROM points_history;

-- Check leaderboard (should show 0 points for everyone)
SELECT * FROM leaderboard_stats ORDER BY total_points DESC;

-- ============================================
-- STEP 2: Test the triggers manually
-- ============================================

-- Find a completed daily goal to test with
SELECT id, user_id, date, content, completed 
FROM daily_goals 
WHERE completed = true 
AND date = CURRENT_DATE
LIMIT 1;

-- IMPORTANT: Copy the 'id' from the result above and use it below
-- Replace 'YOUR_GOAL_ID' with the actual ID

-- Test 1: Uncheck the goal (should remove points if they exist)
-- UPDATE daily_goals SET completed = false WHERE id = 'YOUR_GOAL_ID';

-- Check if points were removed
-- SELECT * FROM points_history ORDER BY created_at DESC LIMIT 5;

-- Test 2: Check the goal again (should add +2 points)
-- UPDATE daily_goals SET completed = true WHERE id = 'YOUR_GOAL_ID';

-- Check if points were added
-- SELECT * FROM points_history ORDER BY created_at DESC LIMIT 5;

-- Check your total points
-- SELECT * FROM leaderboard_stats WHERE user_id = (SELECT user_id FROM daily_goals WHERE id = 'YOUR_GOAL_ID');

-- ============================================
-- STEP 3: Verify triggers exist and are enabled
-- ============================================

-- Check if triggers are created
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND (trigger_name LIKE '%daily_goal%' OR trigger_name LIKE '%syllabus%')
ORDER BY trigger_name;

-- Check trigger functions
SELECT 
    routine_schema,
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%daily_goal%' OR routine_name LIKE '%syllabus%')
ORDER BY routine_name;

-- ============================================
-- STEP 4: If triggers don't exist, recreate them
-- ============================================

-- Run this if triggers are missing:
-- (Copy from LEADERBOARD_SETUP.sql lines 60-106 for daily goal trigger)
-- (Copy from LEADERBOARD_SETUP.sql lines 109-152 for syllabus trigger)
