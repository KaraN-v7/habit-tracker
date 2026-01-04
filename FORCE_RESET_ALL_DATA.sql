-- FORCE RESET EVERYTHING FROM JAN 1, 2026
-- This will uncheck all goals and remove associated points

BEGIN;

-- 1. Uncheck Daily Goals
UPDATE daily_goals 
SET completed = false 
WHERE date >= '2026-01-01';

-- 2. Uncheck Weekly Goals
UPDATE weekly_goal_completions 
SET completed = false 
WHERE date >= '2026-01-01';

-- 3. Uncheck Monthly Goals
UPDATE monthly_goal_completions 
SET completed = false 
WHERE date >= '2026-01-01';

-- 4. Truncate Points History (Just to be absolutely sure we start at 0)
-- Note: The updates above would normally trigger deletions, but a truncate is cleaner for a hard reset.
TRUNCATE TABLE points_history;

COMMIT;

-- 5. Verification: Select what remains (Should be empty/zero)
SELECT 
    (SELECT COUNT(*) FROM daily_goals WHERE date >= '2026-01-01' AND completed = true) as remaining_daily,
    (SELECT COUNT(*) FROM weekly_goal_completions WHERE date >= '2026-01-01' AND completed = true) as remaining_weekly,
    (SELECT COUNT(*) FROM monthly_goal_completions WHERE date >= '2026-01-01' AND completed = true) as remaining_monthly;
