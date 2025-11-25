-- ============================================
-- SUBJECT RECOGNITION - USEFUL SQL QUERIES
-- ============================================
-- Copy and run these in Supabase SQL Editor as needed

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check how many subjects are loaded
SELECT COUNT(*) as total_subjects 
FROM subject_mappings;
-- Expected: 15

-- Check how many variations are loaded
SELECT COUNT(*) as total_variations 
FROM subject_variations;
-- Expected: 100+

-- View all subjects with their colors
SELECT canonical_name, color, class_level 
FROM subject_mappings 
ORDER BY canonical_name;

-- View all variations for a specific subject (e.g., Social Studies)
SELECT sm.canonical_name, sv.variation
FROM subject_variations sv
JOIN subject_mappings sm ON sv.subject_id = sm.id
WHERE sm.canonical_name = 'Social Studies'
ORDER BY sv.variation;

-- ============================================
-- TESTING QUERIES
-- ============================================

-- Test subject recognition for "sst"
SELECT * FROM recognize_subject('study sst for 2 hours');
-- Expected: Social Studies

-- Test subject recognition for "phy"
SELECT * FROM recognize_subject('phy chapter 5');
-- Expected: Physics

-- Test subject recognition for typo "mathmatics"
SELECT * FROM recognize_subject('mathmatics homework');
-- Expected: Mathematics

-- Test with no subject
SELECT * FROM recognize_subject('complete homework');
-- Expected: No results

-- ============================================
-- ADDING NEW VARIATIONS
-- ============================================

-- Add a new variation for Social Studies
INSERT INTO subject_variations (subject_id, variation)
SELECT id, 'social sci'  -- Your custom variation
FROM subject_mappings
WHERE canonical_name = 'Social Studies'
ON CONFLICT (variation) DO NOTHING;

-- Add multiple variations at once
INSERT INTO subject_variations (subject_id, variation)
SELECT id, variation FROM subject_mappings, 
    (VALUES 
        ('ss'),
        ('soc studies'),
        ('soc sci')
    ) AS v(variation)
WHERE canonical_name = 'Social Studies'
ON CONFLICT (variation) DO NOTHING;

-- ============================================
-- ADDING NEW SUBJECTS
-- ============================================

-- Add a completely new subject (e.g., French)
-- Step 1: Add the subject
INSERT INTO subject_mappings (canonical_name, color, class_level) 
VALUES ('French', '#e67e22', 'Class 10 CBSE')
ON CONFLICT (canonical_name) DO NOTHING;

-- Step 2: Add variations for the new subject
INSERT INTO subject_variations (subject_id, variation)
SELECT id, variation FROM subject_mappings, 
    (VALUES 
        ('french'),
        ('French'),
        ('FRENCH'),
        ('fren'),
        ('fr')
    ) AS v(variation)
WHERE canonical_name = 'French'
ON CONFLICT (variation) DO NOTHING;

-- ============================================
-- MODIFYING EXISTING DATA
-- ============================================

-- Change the color of a subject
UPDATE subject_mappings 
SET color = '#your_hex_color' 
WHERE canonical_name = 'Mathematics';

-- Change class level for a subject
UPDATE subject_mappings 
SET class_level = 'Class 11 CBSE' 
WHERE canonical_name = 'Geography';

-- Delete a specific variation (if wrong)
DELETE FROM subject_variations 
WHERE variation = 'wrong_variation';

-- ============================================
-- ANALYTICS QUERIES
-- ============================================

-- See which subjects are being used in goals
-- (Requires you to have created some goals first)
WITH subject_usage AS (
    SELECT 
        content,
        (SELECT canonical_name FROM recognize_subject(content) LIMIT 1) as subject
    FROM daily_goals
    WHERE type = 'todo'
)
SELECT 
    subject,
    COUNT(*) as usage_count
FROM subject_usage
WHERE subject IS NOT NULL
GROUP BY subject
ORDER BY usage_count DESC;

-- Find all goals containing "sst"
SELECT 
    date,
    content,
    completed,
    (SELECT canonical_name FROM recognize_subject(content) LIMIT 1) as recognized_subject
FROM daily_goals
WHERE LOWER(content) LIKE '%sst%'
ORDER BY date DESC;

-- ============================================
-- MAINTENANCE QUERIES
-- ============================================

-- Find duplicate variations (should return 0)
SELECT variation, COUNT(*) 
FROM subject_variations 
GROUP BY variation 
HAVING COUNT(*) > 1;

-- Find subjects with no variations (should return 0)
SELECT sm.canonical_name
FROM subject_mappings sm
LEFT JOIN subject_variations sv ON sv.subject_id = sm.id
WHERE sv.id IS NULL;

-- Count variations per subject
SELECT 
    sm.canonical_name,
    COUNT(sv.id) as variation_count
FROM subject_mappings sm
LEFT JOIN subject_variations sv ON sv.subject_id = sm.id
GROUP BY sm.canonical_name
ORDER BY variation_count DESC;

-- ============================================
-- RESET / CLEANUP QUERIES
-- ============================================

-- ⚠️ DANGER ZONE - Use with caution ⚠️

-- Remove all variations for a subject (to re-add them)
DELETE FROM subject_variations 
WHERE subject_id = (
    SELECT id FROM subject_mappings 
    WHERE canonical_name = 'Subject Name'
);

-- Remove a specific subject and all its variations
DELETE FROM subject_mappings 
WHERE canonical_name = 'Subject Name';
-- Note: Variations will be deleted automatically (CASCADE)

-- ⚠️ NUCLEAR OPTION - Remove EVERYTHING ⚠️
-- Only use if you want to start fresh
-- TRUNCATE TABLE subject_variations CASCADE;
-- TRUNCATE TABLE subject_mappings CASCADE;
-- Then re-run subject-recognition-setup.sql

-- ============================================
-- PERFORMANCE QUERIES
-- ============================================

-- Check if indexes exist
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE tablename IN ('subject_mappings', 'subject_variations')
ORDER BY tablename, indexname;

-- Performance test: How fast is recognition?
-- Run multiple times and check query time in Supabase
EXPLAIN ANALYZE
SELECT * FROM recognize_subject('study sst for 2 hours');

-- ============================================
-- EXPORT QUERIES
-- ============================================

-- Export all subjects and variations as JSON
-- (Useful for backup or sharing with others)
SELECT json_build_object(
    'subjects', (
        SELECT json_agg(
            json_build_object(
                'name', sm.canonical_name,
                'color', sm.color,
                'class_level', sm.class_level,
                'variations', (
                    SELECT json_agg(sv.variation)
                    FROM subject_variations sv
                    WHERE sv.subject_id = sm.id
                )
            )
        )
        FROM subject_mappings sm
    )
) as subject_data;

-- ============================================
-- USEFUL STATISTICS
-- ============================================

-- Get overview statistics
SELECT 
    'Total Subjects' as metric,
    COUNT(*)::text as value
FROM subject_mappings
UNION ALL
SELECT 
    'Total Variations',
    COUNT(*)::text
FROM subject_variations
UNION ALL
SELECT 
    'Avg Variations per Subject',
    ROUND(AVG(variation_count))::text
FROM (
    SELECT COUNT(sv.id) as variation_count
    FROM subject_mappings sm
    LEFT JOIN subject_variations sv ON sv.subject_id = sm.id
    GROUP BY sm.id
) sub;

-- Find the subject with most variations
SELECT 
    sm.canonical_name,
    COUNT(sv.id) as variations
FROM subject_mappings sm
JOIN subject_variations sv ON sv.subject_id = sm.id
GROUP BY sm.canonical_name
ORDER BY variations DESC
LIMIT 1;

-- Find the subject with least variations
SELECT 
    sm.canonical_name,
    COUNT(sv.id) as variations
FROM subject_mappings sm
JOIN subject_variations sv ON sv.subject_id = sm.id
GROUP BY sm.canonical_name
ORDER BY variations ASC
LIMIT 1;

-- ============================================
-- DEVELOPMENT QUERIES
-- ============================================

-- Test a custom recognition pattern
CREATE OR REPLACE FUNCTION test_recognition(test_text TEXT)
RETURNS TABLE(
    input_text TEXT,
    recognized_subject TEXT,
    matched_variation TEXT,
    subject_color TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        test_text,
        r.canonical_name,
        r.matched_variation,
        r.color
    FROM recognize_subject(test_text) r;
END;
$$ LANGUAGE plpgsql;

-- Use it like:
SELECT * FROM test_recognition('study sst for 2 hours');
SELECT * FROM test_recognition('phy chapter 1');
SELECT * FROM test_recognition('mathmatics homework');

-- ============================================
-- COMMON USE CASES
-- ============================================

-- Add regional language variation (e.g., Hindi name for subject)
INSERT INTO subject_variations (subject_id, variation)
SELECT id, 'vigyan'  -- Hindi for Science
FROM subject_mappings
WHERE canonical_name = 'Science'
ON CONFLICT (variation) DO NOTHING;

-- Add short codes for quick typing
INSERT INTO subject_variations (subject_id, variation)
SELECT id, variation FROM subject_mappings, 
    (VALUES 
        ('ms'),  -- Math-Science
        ('m'),   -- Just M (might conflict, be careful)
        ('mth')  -- Another Math variation
    ) AS v(variation)
WHERE canonical_name = 'Mathematics'
ON CONFLICT (variation) DO NOTHING;

-- Add variations specific to your region/school
INSERT INTO subject_variations (subject_id, variation)
SELECT id, 'pol science'  -- Political Science
FROM subject_mappings
WHERE canonical_name = 'Civics'
ON CONFLICT (variation) DO NOTHING;

-- ============================================
-- TROUBLESHOOTING QUERIES
-- ============================================

-- Why isn't my subject being recognized?
-- Check if the variation exists
SELECT EXISTS(
    SELECT 1 FROM subject_variations 
    WHERE LOWER(variation) = LOWER('your_typed_text')
) as variation_exists;

-- Find similar variations (useful for typos)
SELECT variation, canonical_name
FROM subject_variations sv
JOIN subject_mappings sm ON sv.subject_id = sm.id
WHERE variation ILIKE '%your_partial_text%';

-- Check what would match for a partial input
SELECT 
    sm.canonical_name,
    sv.variation
FROM subject_variations sv
JOIN subject_mappings sm ON sv.subject_id = sm.id
WHERE 'your goal text here' ILIKE '%' || sv.variation || '%'
ORDER BY LENGTH(sv.variation) DESC;

-- ============================================
-- END OF USEFUL QUERIES
-- ============================================

-- 💡 Pro Tips:
-- 1. Always backup before running DELETE/TRUNCATE
-- 2. Test new variations before adding many at once
-- 3. Use ON CONFLICT DO NOTHING to prevent duplicates
-- 4. Keep variation names lowercase for consistency
-- 5. Monitor query performance if you add 1000+ variations

-- 🎯 Remember:
-- - Longer variations are matched first
-- - Case-insensitive matching
-- - Only first matched subject is returned
-- - Variations must be unique across all subjects
