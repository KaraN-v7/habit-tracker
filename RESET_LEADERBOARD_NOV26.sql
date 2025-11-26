-- ============================================
-- RESET LEADERBOARD - START FROM NOV 26, 2025 8:00 AM
-- ============================================
-- Only count goals after this time, except syllabus (which counts everything)

-- STEP 1: Clear ALL existing points
DELETE FROM points_history;

-- STEP 2: Award points for daily goals completed AFTER Nov 26, 2025 8:00 AM
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    user_id,
    2 as points,
    'daily_goal' as source_type,
    id::text as source_id,
    updated_at as created_at
FROM daily_goals
WHERE completed = true
AND updated_at >= '2025-11-26 08:00:00+05:30'
ON CONFLICT DO NOTHING;

-- STEP 3: Award points for study hours AFTER Nov 26, 2025 8:00 AM
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
AND updated_at >= '2025-11-26 08:00:00+05:30'
AND LOWER(content) ~ '\d+(?:\.\d+)?\s*(?:hours?|hrs?|h)'
AND FLOOR(
        CASE 
            WHEN LOWER(content) ~ '(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)' THEN
                (SELECT (regexp_matches(LOWER(content), '(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)'))[1]::NUMERIC)
            ELSE 0
        END * 5
    )::INTEGER > 0
ON CONFLICT DO NOTHING;

-- STEP 4: Award points for ALL completed chapters (NO TIME RESTRICTION)
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    s.user_id,
    10 as points,
    'chapter' as source_type,
    c.id::text as source_id,
    GREATEST(c.updated_at, '2025-11-26 08:00:00+05:30') as created_at
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
WHERE c.completed = true
ON CONFLICT DO NOTHING;

-- STEP 5: Award points for ALL completed subjects (NO TIME RESTRICTION)
INSERT INTO points_history (user_id, points, source_type, source_id, created_at)
SELECT 
    s.user_id,
    20 as points,
    'subject' as source_type,
    s.id::text as source_id,
    GREATEST(s.updated_at, '2025-11-26 08:00:00+05:30') as created_at
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

-- STEP 6: Show summary by source type
SELECT 
    source_type,
    COUNT(*) as entries,
    SUM(points) as total_points
FROM points_history
GROUP BY source_type
ORDER BY source_type;

-- STEP 7: Show points per user
SELECT 
    u.email,
    COALESCE(SUM(ph.points), 0) as total_points
FROM auth.users u
LEFT JOIN points_history ph ON ph.user_id = u.id
GROUP BY u.email
ORDER BY total_points DESC;

-- STEP 8: Check leaderboard
SELECT * FROM leaderboard_stats ORDER BY total_points DESC;

-- STEP 9: Show cutoff time for reference
SELECT 
    '2025-11-26 08:00:00+05:30'::timestamp with time zone as cutoff_time,
    NOW() as current_time,
    NOW() - '2025-11-26 08:00:00+05:30'::timestamp with time zone as time_since_cutoff;
