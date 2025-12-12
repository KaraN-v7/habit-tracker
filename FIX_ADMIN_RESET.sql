-- ==========================================
-- FIX ADMIN RESET PERMISSIONS
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Ensure the function handles permissions correctly
CREATE OR REPLACE FUNCTION admin_reset_all_points() RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Explicitly start a transaction block (implicitly handled by functions usually)
    
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admins only.';
    END IF;

    -- Use DELETE instead of TRUNCATE for safety with RLS/Constraints, but delete everything.
    DELETE FROM points_history;
    
    -- Optional: If you want to uncheck everyone's daily goals too (Fresh Start for App)
    -- Uncomment the lines below if you want "Reset All" to also clear all checkboxes.
    -- UPDATE daily_goals SET completed = false;
    -- DELETE FROM weekly_goal_completions;
    -- DELETE FROM monthly_goal_completions;
END;
$$ LANGUAGE plpgsql;

-- 2. Explicitly Grant Execute Permission to Authenticated Users
-- (Security Definer handles the actual privilege escalation, but users need to be able to CALL it)
GRANT EXECUTE ON FUNCTION admin_reset_all_points() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION add_admin_by_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_my_progress(text) TO authenticated;

-- 3. Ensure Admins table is readable
GRANT SELECT ON app_admins TO authenticated;
