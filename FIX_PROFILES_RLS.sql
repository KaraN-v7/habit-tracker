-- Fix RLS Policy for profiles table to allow updates

-- First, check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- Drop and recreate the UPDATE policy with correct permissions
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Also ensure INSERT policy exists (for upsert)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Verify policies are correct
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'profiles';

-- Test: Try to update your own profile manually
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users
-- (You can find it by running: SELECT id, email FROM auth.users WHERE email = 'your-email@example.com')

/*
UPDATE profiles 
SET 
    display_name = 'Karan Maurya',
    updated_at = NOW()
WHERE id = 'YOUR_USER_ID_HERE';
*/

-- Check if the update worked
SELECT id, display_name, avatar_url, updated_at FROM profiles;
