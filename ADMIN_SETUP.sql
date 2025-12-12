-- ==========================================
-- ADMIN & RESET FEATURES SETUP
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Create Admin Table
CREATE TABLE IF NOT EXISTS app_admins (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert the specific user as admin (e62f168f-bd71-43e9-8e94-af908a69c691)
INSERT INTO app_admins (user_id)
VALUES ('e62f168f-bd71-43e9-8e94-af908a69c691')
ON CONFLICT (user_id) DO NOTHING;

-- 3. Enable RLS but allow public read (so UI can check if user is admin)
ALTER TABLE app_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins visible to everyone" ON app_admins;
CREATE POLICY "Admins visible to everyone" ON app_admins FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage admins" ON app_admins;
CREATE POLICY "Admins can manage admins" ON app_admins FOR ALL USING (auth.uid() IN (SELECT user_id FROM app_admins));

-- 4. Helper Function: Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql;

-- 5. Helper Function: Add new admin (Admin Only)
CREATE OR REPLACE FUNCTION add_admin_by_id(target_user_id UUID) RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can add other admins.';
    END IF;
    INSERT INTO app_admins (user_id) VALUES (target_user_id) ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 6. User Function: Reset My Progress
CREATE OR REPLACE FUNCTION reset_my_progress(period text) RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_user UUID := auth.uid();
    start_date DATE;
BEGIN
    IF period = 'today' THEN
        start_date := CURRENT_DATE;
    ELSIF period = 'week' THEN
        -- Start of week (Monday as start?) or standard Postgres week
        start_date := date_trunc('week', CURRENT_DATE)::DATE;
    ELSIF period = 'month' THEN
        start_date := date_trunc('month', CURRENT_DATE)::DATE;
    ELSE
        RAISE EXCEPTION 'Invalid period. Use today, week, or month.';
    END IF;

    -- 1. Uncheck Daily Goals
    UPDATE daily_goals
    SET completed = false
    WHERE user_id = target_user
    AND date >= start_date;

    -- 2. Uncheck Weekly Goal Completions
    DELETE FROM weekly_goal_completions wgc
    USING weekly_goals wg
    WHERE wgc.weekly_goal_id = wg.id
    AND wg.user_id = target_user
    AND wgc.date >= start_date::text;

    -- 3. Uncheck Monthly Goal Completions
    DELETE FROM monthly_goal_completions mgc
    USING monthly_goals mg
    WHERE mgc.monthly_goal_id = mg.id
    AND mg.user_id = target_user
    AND mgc.date >= start_date::text;

    -- Note: We rely on existing triggers to remove points from points_history when items are unchecked/deleted.
END;
$$ LANGUAGE plpgsql;

-- 7. Admin Function: Reset (Clear) ALL Points for Everyone
CREATE OR REPLACE FUNCTION admin_reset_all_points() RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admins only.';
    END IF;

    -- Delete all points history
    DELETE FROM points_history;
END;
$$ LANGUAGE plpgsql;

-- 8. Update Date Restriction Trigger to Allow Admins
CREATE OR REPLACE FUNCTION enforce_current_date_edit() RETURNS TRIGGER AS $$
BEGIN
    -- Allow Admins to bypass date restrictions
    IF is_admin() THEN
        RETURN NEW;
    END IF;

    -- Check if the date of the goal is NOT today
    IF NEW.date != CURRENT_DATE THEN
        RAISE EXCEPTION 'You can only edit goals for the current date (Today).';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
