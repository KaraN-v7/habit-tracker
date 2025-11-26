-- ============================================
-- COMPLETE RESET - DELETE ALL USERS & DATA
-- ============================================
-- WARNING: This will delete EVERYTHING and everyone will need to re-sign up
-- All user data, goals, syllabus, profiles, and points will be permanently deleted

-- STEP 1: Delete all users (this will CASCADE delete everything)
-- Due to ON DELETE CASCADE, this will automatically delete:
-- - daily_goals
-- - weekly_goals
-- - monthly_goals
-- - subjects & chapters
-- - profiles
-- - points_history
-- - user_preferences
-- - gamification_stats
-- - badges

DELETE FROM auth.users;

-- STEP 2: Verify everything is deleted
SELECT 'Users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'Profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'Points History', COUNT(*) FROM points_history
UNION ALL
SELECT 'Daily Goals', COUNT(*) FROM daily_goals
UNION ALL
SELECT 'Weekly Goals', COUNT(*) FROM weekly_goals
UNION ALL
SELECT 'Monthly Goals', COUNT(*) FROM monthly_goals
UNION ALL
SELECT 'Subjects', COUNT(*) FROM subjects
UNION ALL
SELECT 'Chapters', COUNT(*) FROM chapters
UNION ALL
SELECT 'Gamification Stats', COUNT(*) FROM gamification_stats;

-- STEP 3: Reset ID sequences (optional, for clean IDs)
-- This ensures new users start with clean incremental IDs
-- Note: UUIDs don't use sequences, so this is just for reference

-- All tables should now be empty!
-- Users can now sign up fresh and the leaderboard will start from zero
-- All triggers are already in place and will work correctly

SELECT 'All data deleted. Users can now re-sign up.' as status;
