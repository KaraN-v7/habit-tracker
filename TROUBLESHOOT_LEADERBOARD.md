# Leaderboard Troubleshooting Guide

## Step 1: Run the SQL Script
1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Open the file `LEADERBOARD_SETUP.sql` from your project
4. Copy ALL the contents
5. Paste into Supabase SQL Editor
6. Click **Run** (or press Ctrl+Enter)

## Step 2: Create Your Profile
After running the SQL script, you need to create a profile entry for yourself.

Run this SQL query in Supabase SQL Editor (replace with your actual user ID):

```sql
-- First, find your user ID
SELECT id, email FROM auth.users;

-- Then create your profile (replace 'YOUR_USER_ID' with the actual ID from above)
INSERT INTO profiles (id, display_name, avatar_url)
VALUES (
    'YOUR_USER_ID',
    'Karan Maurya',
    'YOUR_AVATAR_URL_IF_ANY'
)
ON CONFLICT (id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url;
```

## Step 3: Verify the Setup

### Check if triggers are working:
```sql
-- Check if points_history table exists
SELECT * FROM points_history LIMIT 10;

-- Check if profiles table exists
SELECT * FROM profiles;

-- Check if leaderboard_stats view exists
SELECT * FROM leaderboard_stats;
```

### Check if triggers are created:
```sql
-- List all triggers
SELECT 
    trigger_name, 
    event_object_table, 
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%daily_goal%' OR trigger_name LIKE '%syllabus%';
```

## Step 4: Test Points System

1. Go to your Daily Goals page
2. Check a goal for TODAY (November 26, 2025)
3. Run this query to see if points were added:

```sql
SELECT * FROM points_history ORDER BY created_at DESC LIMIT 10;
```

## Common Issues:

### Issue 1: "No data available for this period yet"
**Cause:** No profile exists for your user
**Fix:** Run Step 2 above

### Issue 2: Points not updating
**Cause:** SQL script not run or triggers not created
**Fix:** Run Step 1 above

### Issue 3: "0 Points" showing
**Cause:** Either no profile exists, or no goals have been completed TODAY
**Fix:** 
- Ensure profile exists (Step 2)
- Complete a goal for TODAY's date
- Check points_history table

### Issue 4: RLS Policy Error
**Cause:** The SECURITY DEFINER might not be set correctly
**Fix:** Re-run the LEADERBOARD_SETUP.sql script

## Quick Test:

After setting everything up, complete these steps:
1. ✅ Check a daily goal for TODAY
2. ✅ Refresh the page
3. ✅ Check sidebar - should show "2 Points" (or more if it has study hours)
4. ✅ Go to Leaderboard page - should show your name with points
