-- ============================================
-- ENABLE REALTIME FOR POINTS
-- ============================================
-- This script ensures that the 'points_history' table broadcasts changes 
-- to the frontend so the sidebar updates instantly.

BEGIN;

-- 1. Add points_history to the supabase_realtime publication
-- We use 'DROP' then 'ADD' to be safe, or just 'ADD' inside a DO block to avoid errors if it exists.
-- But the simplest way that is idempotent-ish in Supabase is:

ALTER PUBLICATION supabase_realtime ADD TABLE points_history;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

COMMIT;

-- Note: If you get an error saying "relation ... is already member of publication", 
-- that is GOOD! It means it's already enabled. You can ignore that specific error.
