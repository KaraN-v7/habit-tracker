-- Add last_task_completion_date to gamification_stats table
ALTER TABLE gamification_stats 
ADD COLUMN IF NOT EXISTS last_task_completion_date DATE;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Added last_task_completion_date column successfully!';
END $$;
