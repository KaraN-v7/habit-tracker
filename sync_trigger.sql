-- Function to sync daily goal completion with syllabus chapters
CREATE OR REPLACE FUNCTION sync_daily_goal_to_chapter()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if parent_id is present (which stores the chapter_id)
    IF NEW.parent_id IS NOT NULL THEN
        -- Update the corresponding chapter's completion status
        -- We join with subjects to ensure we only update chapters belonging to the correct user
        UPDATE chapters c
        SET completed = NEW.completed,
            updated_at = NOW()
        FROM subjects s
        WHERE c.subject_id = s.id
        AND s.user_id = NEW.user_id
        AND c.chapter_id = NEW.parent_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_sync_daily_goal_chapter ON daily_goals;
CREATE TRIGGER trigger_sync_daily_goal_chapter
AFTER UPDATE OF completed ON daily_goals
FOR EACH ROW
EXECUTE FUNCTION sync_daily_goal_to_chapter();
