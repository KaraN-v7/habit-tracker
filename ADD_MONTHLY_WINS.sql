-- Add Monthly Wins table
CREATE TABLE IF NOT EXISTS monthly_wins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 0 AND month <= 11),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE monthly_wins ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own monthly wins"
    ON monthly_wins FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly wins"
    ON monthly_wins FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly wins"
    ON monthly_wins FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly wins"
    ON monthly_wins FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_monthly_wins_updated_at BEFORE UPDATE ON monthly_wins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
