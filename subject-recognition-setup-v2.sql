-- ============================================
-- SUBJECT RECOGNITION SYSTEM - VERSION 2 (Updated)
-- ============================================
-- This version handles existing tables/policies gracefully

-- ============================================
-- 1. DROP EXISTING POLICIES (if they exist)
-- ============================================
DROP POLICY IF EXISTS "Anyone can view subject mappings" ON subject_mappings;
DROP POLICY IF EXISTS "Anyone can view subject variations" ON subject_variations;

-- ============================================
-- 2. CREATE TABLES (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS subject_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    canonical_name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#3498db',
    class_level TEXT DEFAULT 'Class 10 CBSE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subject_variations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID REFERENCES subject_mappings(id) ON DELETE CASCADE NOT NULL,
    variation TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_subject_variations_lookup ON subject_variations(LOWER(variation));
CREATE INDEX IF NOT EXISTS idx_subject_mappings_class ON subject_mappings(class_level);

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE subject_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subject mappings"
    ON subject_mappings FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view subject variations"
    ON subject_variations FOR SELECT
    USING (true);

-- ============================================
-- 5. SEED DATA - Class 10 CBSE Subjects
-- ============================================

-- Mathematics
INSERT INTO subject_mappings (canonical_name, color, class_level) 
VALUES ('Mathematics', '#e74c3c', 'Class 10 CBSE')
ON CONFLICT (canonical_name) DO NOTHING;

INSERT INTO subject_variations (subject_id, variation)
SELECT id, variation FROM subject_mappings, 
    (VALUES ('math'), ('maths'), ('mathematics'), ('Math'), ('Maths'), 
     ('MATH'), ('MATHS'), ('mathmatics'), ('mathematic'), ('methmatics')) AS v(variation)
WHERE canonical_name = 'Mathematics'
ON CONFLICT (variation) DO NOTHING;

-- Science
INSERT INTO subject_mappings (canonical_name, color, class_level) 
VALUES ('Science', '#27ae60', 'Class 10 CBSE')
ON CONFLICT (canonical_name) DO NOTHING;

INSERT INTO subject_variations (subject_id, variation)
SELECT id, variation FROM subject_mappings, 
    (VALUES ('science'), ('Science'), ('SCIENCE'), ('sci'), ('scien'), ('sceience')) AS v(variation)
WHERE canonical_name = 'Science'
ON CONFLICT (variation) DO NOTHING;

-- Physics
INSERT INTO subject_mappings (canonical_name, color, class_level) 
VALUES ('Physics', '#3498db', 'Class 10 CBSE')
ON CONFLICT (canonical_name) DO NOTHING;

INSERT INTO subject_variations (subject_id, variation)
SELECT id, variation FROM subject_mappings, 
    (VALUES ('physics'), ('Physics'), ('PHYSICS'), ('phy'), ('Phy'), ('phys'), 
     ('fysics'), ('phisics'), ('physic')) AS v(variation)
WHERE canonical_name = 'Physics'
ON CONFLICT (variation) DO NOTHING;

-- Chemistry
INSERT INTO subject_mappings (canonical_name, color, class_level) 
VALUES ('Chemistry', '#9b59b6', 'Class 10 CBSE')
ON CONFLICT (canonical_name) DO NOTHING;

INSERT INTO subject_variations (subject_id, variation)
SELECT id, variation FROM subject_mappings, 
    (VALUES ('chemistry'), ('Chemistry'), ('CHEMISTRY'), ('chem'), ('Chem'), 
     ('chemist'), ('chemisrty'), ('chemsitry'), ('chemi')) AS v(variation)
WHERE canonical_name = 'Chemistry'
ON CONFLICT (variation) DO NOTHING;

-- Biology
INSERT INTO subject_mappings (canonical_name, color, class_level) 
VALUES ('Biology', '#2ecc71', 'Class 10 CBSE')
ON CONFLICT (canonical_name) DO NOTHING;

INSERT INTO subject_variations (subject_id, variation)
SELECT id, variation FROM subject_mappings, 
    (VALUES ('biology'), ('Biology'), ('BIOLOGY'), ('bio'), ('Bio'), ('biol'), 
     ('biologi'), ('biolagy'), ('biolgy')) AS v(variation)
WHERE canonical_name = 'Biology'
ON CONFLICT (variation) DO NOTHING;

-- Social Studies / Social Science (SST)
INSERT INTO subject_mappings (canonical_name, color, class_level) 
VALUES ('Social Studies', '#f39c12', 'Class 10 CBSE')
ON CONFLICT (canonical_name) DO NOTHING;

INSERT INTO subject_variations (subject_id, variation)
SELECT id, variation FROM subject_mappings, 
    (VALUES ('sst'), ('SST'), ('social'), ('Social'), ('social studies'), 
     ('Social Studies'), ('SOCIAL STUDIES'), ('social science'), ('Social Science'),
     ('s.st'), ('s.s.t'), ('socail'), ('soical'), ('sosial'), ('social st')) AS v(variation)
WHERE canonical_name = 'Social Studies'
ON CONFLICT (variation) DO NOTHING;

-- History
INSERT INTO subject_mappings (canonical_name, color, class_level) 
VALUES ('History', '#d35400', 'Class 10 CBSE')
ON CONFLICT (canonical_name) DO NOTHING;

INSERT INTO subject_variations (subject_id, variation)
SELECT id, variation FROM subject_mappings, 
    (VALUES ('history'), ('History'), ('HISTORY'), ('hist'), ('Hist'), 
     ('histroy'), ('histry'), ('hisotry')) AS v(variation)
WHERE canonical_name = 'History'
ON CONFLICT (variation) DO NOTHING;

-- Geography
INSERT INTO subject_mappings (canonical_name, color, class_level) 
VALUES ('Geography', '#16a085', 'Class 10 CBSE')
ON CONFLICT (canonical_name) DO NOTHING;

INSERT INTO subject_variations (subject_id, variation)
SELECT id, variation FROM subject_mappings, 
    (VALUES ('geography'), ('Geography'), ('GEOGRAPHY'), ('geo'), ('Geo'), 
     ('geog'), ('geograpy'), ('geografy'), ('geografi')) AS v(variation)
WHERE canonical_name = 'Geography'
ON CONFLICT (variation) DO NOTHING;

-- Civics
INSERT INTO subject_mappings (canonical_name, color, class_level) 
VALUES ('Civics', '#8e44ad', 'Class 10 CBSE')
ON CONFLICT (canonical_name) DO NOTHING;

INSERT INTO subject_variations (subject_id, variation)
SELECT id, variation FROM subject_mappings, 
    (VALUES ('civics'), ('Civics'), ('CIVICS'), ('civic'), ('political science'), 
     ('Political Science'), ('pol sci'), ('pol science'), ('civix')) AS v(variation)
WHERE canonical_name = 'Civics'
ON CONFLICT (variation) DO NOTHING;

-- Economics
INSERT INTO subject_mappings (canonical_name, color, class_level) 
VALUES ('Economics', '#c0392b', 'Class 10 CBSE')
ON CONFLICT (canonical_name) DO NOTHING;

INSERT INTO subject_variations (subject_id, variation)
SELECT id, variation FROM subject_mappings, 
    (VALUES ('economics'), ('Economics'), ('ECONOMICS'), ('eco'), ('Eco'), 
     ('econ'), ('economy'), ('economix')) AS v(variation)
WHERE canonical_name = 'Economics'
ON CONFLICT (variation) DO NOTHING;

-- English
INSERT INTO subject_mappings (canonical_name, color, class_level) 
VALUES ('English', '#34495e', 'Class 10 CBSE')
ON CONFLICT (canonical_name) DO NOTHING;

INSERT INTO subject_variations (subject_id, variation)
SELECT id, variation FROM subject_mappings, 
    (VALUES ('english'), ('English'), ('ENGLISH'), ('eng'), ('Eng'), 
     ('englsh'), ('enlish'), ('engish')) AS v(variation)
WHERE canonical_name = 'English'
ON CONFLICT (variation) DO NOTHING;

-- Hindi
INSERT INTO subject_mappings (canonical_name, color, class_level) 
VALUES ('Hindi', '#e67e22', 'Class 10 CBSE')
ON CONFLICT (canonical_name) DO NOTHING;

INSERT INTO subject_variations (subject_id, variation)
SELECT id, variation FROM subject_mappings, 
    (VALUES ('hindi'), ('Hindi'), ('HINDI'), ('hnd'), ('Hnd'), 
     ('hin'), ('hindy'), ('hidi')) AS v(variation)
WHERE canonical_name = 'Hindi'
ON CONFLICT (variation) DO NOTHING;

-- Sanskrit
INSERT INTO subject_mappings (canonical_name, color, class_level) 
VALUES ('Sanskrit', '#95a5a6', 'Class 10 CBSE')
ON CONFLICT (canonical_name) DO NOTHING;

INSERT INTO subject_variations (subject_id, variation)
SELECT id, variation FROM subject_mappings, 
    (VALUES ('sanskrit'), ('Sanskrit'), ('SANSKRIT'), ('sans'), ('Sans'), 
     ('sansk'), ('sanskrt'), ('sanskit')) AS v(variation)
WHERE canonical_name = 'Sanskrit'
ON CONFLICT (variation) DO NOTHING;

-- Computer Science
INSERT INTO subject_mappings (canonical_name, color, class_level) 
VALUES ('Computer Science', '#1abc9c', 'Class 10 CBSE')
ON CONFLICT (canonical_name) DO NOTHING;

INSERT INTO subject_variations (subject_id, variation)
SELECT id, variation FROM subject_mappings, 
    (VALUES ('computer'), ('Computer'), ('COMPUTER'), ('comp'), ('Comp'), 
     ('computer science'), ('Computer Science'), ('CS'), ('cs'), ('IT'), ('it'),
     ('information technology'), ('coding'), ('Coding'), ('programming'), ('Programming'),
     ('compter'), ('computr'), ('comp sci')) AS v(variation)
WHERE canonical_name = 'Computer Science'
ON CONFLICT (variation) DO NOTHING;

-- Physical Education
INSERT INTO subject_mappings (canonical_name, color, class_level) 
VALUES ('Physical Education', '#7f8c8d', 'Class 10 CBSE')
ON CONFLICT (canonical_name) DO NOTHING;

INSERT INTO subject_variations (subject_id, variation)
SELECT id, variation FROM subject_mappings, 
    (VALUES ('physical education'), ('Physical Education'), ('PE'), ('pe'), 
     ('P.E'), ('p.e'), ('phys ed'), ('physical ed'), ('phy ed'), ('sports')) AS v(variation)
WHERE canonical_name = 'Physical Education'
ON CONFLICT (variation) DO NOTHING;

-- ============================================
-- 6. HELPER FUNCTION
-- ============================================

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
    WHERE LOWER(input_text) LIKE '%' || LOWER(sv.variation) || '%'
    ORDER BY LENGTH(sv.variation) DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Subject Recognition System setup complete!';
    RAISE NOTICE '✅ All 15 Class 10 CBSE subjects loaded';
    RAISE NOTICE '✅ 100+ variations and typos recognized';
    RAISE NOTICE '✅ SST → Social Studies mapping ready!';
    RAISE NOTICE '✅ Ready to use in analytics!';
END $$;
