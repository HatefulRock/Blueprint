-- Migration: Phase 3 - Personalization & Goals
-- Created: 2026-02-03
-- Description: Adds UserProfile table and enhances Goal table with daily targets and streak management

-- Create user_profiles table for placement results and preferences
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    -- Placement/diagnostic results
    estimated_level VARCHAR(10),  -- A1, A2, B1, B2, C1, C2
    placement_completed_at TIMESTAMP,
    placement_score INTEGER,
    placement_language VARCHAR(50),

    -- Learning preferences
    daily_goal_minutes INTEGER DEFAULT 15,
    daily_goal_cards INTEGER DEFAULT 20,
    preferred_practice_time VARCHAR(20),  -- morning, afternoon, evening
    notification_enabled BOOLEAN DEFAULT TRUE,
    preferred_practice_modes TEXT,  -- JSON array of modes

    -- Streak protection
    streak_freezes_remaining INTEGER DEFAULT 2,
    last_streak_freeze_used DATE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for user lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Add daily goal fields to goals table
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS cards_per_day INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS minutes_per_day INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS grammar_exercises_per_day INTEGER DEFAULT 5;

-- Add streak management fields to goals table
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_freezes_available INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- Create index for streak tracking
CREATE INDEX IF NOT EXISTS idx_goals_last_activity ON goals(last_activity_date);

-- Create trigger to update updated_at timestamp for user_profiles
CREATE OR REPLACE FUNCTION update_user_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_profile_timestamp ON user_profiles;
CREATE TRIGGER trigger_update_user_profile_timestamp
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profile_timestamp();

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'Extended user profile for learning preferences and placement test results';
COMMENT ON COLUMN user_profiles.estimated_level IS 'CEFR level estimated from diagnostic test (A1-C2)';
COMMENT ON COLUMN user_profiles.placement_score IS 'Raw score from the diagnostic test';
COMMENT ON COLUMN user_profiles.preferred_practice_time IS 'User preference for when to practice (morning/afternoon/evening)';
COMMENT ON COLUMN user_profiles.streak_freezes_remaining IS 'Number of streak freezes available to protect streak';

COMMENT ON COLUMN goals.cards_per_day IS 'Daily goal for flashcard reviews';
COMMENT ON COLUMN goals.minutes_per_day IS 'Daily goal for practice time in minutes';
COMMENT ON COLUMN goals.grammar_exercises_per_day IS 'Daily goal for grammar exercises';
COMMENT ON COLUMN goals.current_streak IS 'Current consecutive days of activity';
COMMENT ON COLUMN goals.longest_streak IS 'Best streak ever achieved';
COMMENT ON COLUMN goals.streak_freezes_available IS 'Streak freezes that can protect against missed days';
COMMENT ON COLUMN goals.last_activity_date IS 'Last date user had practice activity';
