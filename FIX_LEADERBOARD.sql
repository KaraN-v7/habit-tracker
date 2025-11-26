-- ============================================
-- LEADERBOARD FIX & DIAGNOSTIC SCRIPT
-- ============================================

-- STEP 1: Check current state
-- Run these one by one to see what's happening

-- Check if any profiles exist
SELECT COUNT(*) as profile_count FROM profiles;

-- Check if any points exist
SELECT COUNT(*) as points_count FROM points_history;

-- Check all users (from auth)
SELECT id, email, created_at FROM auth.users;

-- ============================================
-- STEP 2: CREATE PROFILES FOR ALL EXISTING USERS
-- This is the most likely issue - users need profiles!
-- ============================================

INSERT INTO profiles (id, display_name, avatar_url)
SELECT 
    id,
    COALESCE(
        raw_user_meta_data->>'custom_full_name',
        raw_user_meta_data->>'full_name',
        SPLIT_PART(email, '@', 1)
    ) as display_name,
    COALESCE(
        raw_user_meta_data->>'custom_avatar_url',
        raw_user_meta_data->>'avatar_url'
    ) as avatar_url
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET 
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();

-- Verify profiles were created
SELECT id, display_name, avatar_url FROM profiles;

-- ============================================
-- STEP 3: MANUALLY AWARD POINTS FOR EXISTING COMPLETED GOALS
-- This will backfill points for goals already completed
-- ============================================

-- Award points for all completed daily goals
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    user_id,
    2 as points,
    'daily_goal' as source_type,
    id::text as source_id,
    updated_at as created_at
FROM daily_goals
WHERE completed = true
ON CONFLICT DO NOTHING;

-- Award points for study hours in completed daily goals
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    user_id,
    FLOOR(
        CASE 
            WHEN LOWER(content) ~ '(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)' THEN
                (SELECT (regexp_matches(LOWER(content), '(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)'))[1]::NUMERIC)
            ELSE 0
        END * 5
    )::INTEGER as points,
    'study_hour' as source_type,
    id::text || '_study' as source_id,
    updated_at as created_at
FROM daily_goals
WHERE completed = true
AND LOWER(content) ~ '\d+(?:\.\d+)?\s*(?:hours?|hrs?|h)'
AND FLOOR(
        CASE 
            WHEN LOWER(content) ~ '(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)' THEN
                (SELECT (regexp_matches(LOWER(content), '(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)'))[1]::NUMERIC)
            ELSE 0
        END * 5
    )::INTEGER > 0
ON CONFLICT DO NOTHING;

-- Award points for completed chapters
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    s.user_id,
    10 as points,
    'chapter' as source_type,
    c.id::text as source_id,
    c.updated_at as created_at
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
WHERE c.completed = true
ON CONFLICT DO NOTHING;

-- Award points for completed subjects (all chapters done)
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    s.user_id,
    20 as points,
    'subject' as source_type,
    s.id::text as source_id,
    s.updated_at as created_at
FROM subjects s
WHERE NOT EXISTS (
    SELECT 1 FROM chapters c 
    WHERE c.subject_id = s.id 
    AND c.completed = false
)
AND EXISTS (
    SELECT 1 FROM chapters c 
    WHERE c.subject_id = s.id
)
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 4: VERIFY THE SETUP
-- ============================================

-- Check points_history
SELECT 
    source_type,
    COUNT(*) as count,
    SUM(points) as total_points
FROM points_history
GROUP BY source_type;

-- Check leaderboard stats
SELECT * FROM leaderboard_stats
ORDER BY total_points DESC
LIMIT 10;

-- ============================================
-- STEP 5: VERIFY TRIGGERS ARE WORKING
-- ============================================

-- List all triggers
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND (
    trigger_name LIKE '%daily_goal%' 
    OR trigger_name LIKE '%syllabus%'
    OR trigger_name LIKE '%enforce%'
)
ORDER BY trigger_name;

-- Check trigger functions
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
    routine_name LIKE '%daily_goal%'
    OR routine_name LIKE '%syllabus%'
    OR routine_name LIKE '%enforce%'
);

-- ============================================
-- DIAGNOSTIC INFO
-- ============================================

-- Show summary
SELECT 
    'Users' as item,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Profiles' as item,
    COUNT(*) as count
FROM profiles
UNION ALL
SELECT 
    'Points History' as item,
    COUNT(*) as count
FROM points_history
UNION ALL
SELECT 
    'Daily Goals (Completed)' as item,
    COUNT(*) as count
FROM daily_goals
WHERE completed = true
UNION ALL
SELECT 
    'Chapters (Completed)' as item,
    COUNT(*) as count
FROM chapters
WHERE completed = true;
