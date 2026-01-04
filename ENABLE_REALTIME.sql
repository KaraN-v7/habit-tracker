-- Enable Realtime for points_history table
BEGIN;

-- Check if publication exists (it usually does in Supabase)
-- Try to add table to publication. 
-- If it fails, we catch it or it just errors. This is standard Supabase setup.
ALTER PUBLICATION supabase_realtime ADD TABLE points_history;

COMMIT;
