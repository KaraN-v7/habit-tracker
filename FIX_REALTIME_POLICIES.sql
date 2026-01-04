-- FIX REALTIME PERMISSIONS
-- This ensures the frontend receives the "Signal" when points are added.

BEGIN;

-- 1. Enable RLS on the table (good practice)
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own points" ON points_history;
DROP POLICY IF EXISTS "Users can read own points history" ON points_history;

-- 3. Create a permission policy
-- This allows the frontend to "see" the rows inserted by the triggers
CREATE POLICY "Users can view own points" ON points_history
    FOR SELECT
    USING (auth.uid() = user_id);

COMMIT;
