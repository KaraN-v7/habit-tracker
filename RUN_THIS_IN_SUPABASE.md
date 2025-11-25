# 🛠️ **Action Required: Fix Database Tables**

The error `Error initializing stats: {}` is happening because the **Gamification tables do not exist** in your Supabase database yet.

You need to run the following SQL code in your Supabase SQL Editor to fix this.

## **Steps:**

1.  Go to your **Supabase Dashboard**.
2.  Click on the **SQL Editor** icon (left sidebar).
3.  Click **New Query**.
4.  **Copy and Paste** the code below into the editor.
5.  Click **Run**.

```sql
-- 1. Create Gamification Stats Table
CREATE TABLE IF NOT EXISTS gamification_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tasks_completed INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_study_hours NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. Create Badges Table
CREATE TABLE IF NOT EXISTS badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    badge_id TEXT NOT NULL,
    unlocked BOOLEAN DEFAULT FALSE,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- 3. Enable RLS
ALTER TABLE gamification_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
-- (Drop first to avoid errors if they exist)
DROP POLICY IF EXISTS "Users can view their own gamification stats" ON gamification_stats;
DROP POLICY IF EXISTS "Users can insert their own gamification stats" ON gamification_stats;
DROP POLICY IF EXISTS "Users can update their own gamification stats" ON gamification_stats;
DROP POLICY IF EXISTS "Users can delete their own gamification stats" ON gamification_stats;

CREATE POLICY "Users can view their own gamification stats" ON gamification_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own gamification stats" ON gamification_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own gamification stats" ON gamification_stats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own gamification stats" ON gamification_stats FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own badges" ON badges;
DROP POLICY IF EXISTS "Users can insert their own badges" ON badges;
DROP POLICY IF EXISTS "Users can update their own badges" ON badges;
DROP POLICY IF EXISTS "Users can delete their own badges" ON badges;

CREATE POLICY "Users can view their own badges" ON badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own badges" ON badges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own badges" ON badges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own badges" ON badges FOR DELETE USING (auth.uid() = user_id);

-- 5. Fix Permissions
GRANT ALL ON gamification_stats TO authenticated;
GRANT ALL ON badges TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 6. Success Message
DO $$
BEGIN
    RAISE NOTICE '✅ Gamification tables created successfully!';
END $$;
```

## **Why is this needed?**
The app is trying to save your stats to the `gamification_stats` table, but that table hasn't been created in the database yet. Running this script will create it and allow the app to work correctly.
