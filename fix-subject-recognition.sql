-- ============================================
-- FIX: Subject Recognition - Word Boundary Matching
-- ============================================
-- This fixes the issue where "Epics" was matching "cs" in Computer Science
-- Now only matches complete words, not substrings

-- Drop the old function
DROP FUNCTION IF EXISTS recognize_subject(TEXT);

-- Create improved function with word boundary matching
CREATE OR REPLACE FUNCTION recognize_subject(input_text TEXT)
RETURNS TABLE(
    canonical_name TEXT,
    color TEXT,
    matched_variation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.canonical_name,
        sm.color,
        sv.variation as matched_variation
    FROM subject_variations sv
    JOIN subject_mappings sm ON sv.subject_id = sm.id
    WHERE 
        -- Use regex word boundary matching
        -- \y matches word boundaries (start/end of word)
        LOWER(input_text) ~ ('\y' || LOWER(sv.variation) || '\y')
    ORDER BY LENGTH(sv.variation) DESC  -- Prefer longer matches
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Subject Recognition function updated!';
    RAISE NOTICE '✅ Now uses word boundary matching';
    RAISE NOTICE '✅ "Epics" will no longer match "cs"';
END $$;
