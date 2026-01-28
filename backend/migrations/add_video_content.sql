-- Migration: Add video content support for Gemini 3 multimodal learning
-- Created: 2026-01-26
-- Description: Creates tables for storing video content, analysis results,
--              and linking vocabulary from videos to user's word bank

-- Create video_content table
CREATE TABLE IF NOT EXISTS video_content (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    target_language VARCHAR(50) NOT NULL,
    native_language VARCHAR(50) DEFAULT 'English',

    -- Video analysis results (stored as JSONB for flexibility)
    transcript JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Timestamped subtitles
    vocabulary JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Extracted words with context
    grammar_points JSONB DEFAULT '[]'::jsonb,       -- Identified grammar patterns
    exercises JSONB DEFAULT '{}'::jsonb,            -- Auto-generated exercises
    cultural_notes TEXT,                            -- Cultural context notes

    -- Metadata
    difficulty_level VARCHAR(10),  -- A1, A2, B1, B2, C1, C2
    duration_seconds INTEGER,      -- Video duration in seconds
    file_size_bytes BIGINT,        -- Original file size
    video_url TEXT,                -- Optional: URL if video is hosted externally

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_watched_at TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_difficulty CHECK (
        difficulty_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Unknown')
    )
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_video_content_user
    ON video_content(user_id);

CREATE INDEX IF NOT EXISTS idx_video_content_language
    ON video_content(target_language);

CREATE INDEX IF NOT EXISTS idx_video_content_difficulty
    ON video_content(difficulty_level);

CREATE INDEX IF NOT EXISTS idx_video_content_created
    ON video_content(created_at DESC);

-- Create GIN index for JSON columns to enable efficient querying
CREATE INDEX IF NOT EXISTS idx_video_content_transcript
    ON video_content USING GIN (transcript);

CREATE INDEX IF NOT EXISTS idx_video_content_vocabulary
    ON video_content USING GIN (vocabulary);


-- Create video_vocabulary table to link video words to user's word bank
-- This allows users to save specific vocabulary from videos they watch
CREATE TABLE IF NOT EXISTS video_vocabulary (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL REFERENCES video_content(id) ON DELETE CASCADE,
    word_id INTEGER REFERENCES words(id) ON DELETE SET NULL,  -- Optional link to words table

    -- Word details (stored even if not linked to words table)
    word TEXT NOT NULL,
    translation TEXT,
    part_of_speech VARCHAR(50),
    difficulty VARCHAR(10),

    -- Video context
    timestamp VARCHAR(10),  -- When word appears in video (MM:SS format)
    context_sentence TEXT,  -- Sentence from video where word appears

    -- User progress
    is_saved BOOLEAN DEFAULT FALSE,      -- Whether user saved this word
    times_reviewed INTEGER DEFAULT 0,    -- How many times user reviewed this word
    last_reviewed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure no duplicate word-video pairs
    CONSTRAINT unique_video_word UNIQUE (video_id, word)
);

-- Create indexes for video_vocabulary
CREATE INDEX IF NOT EXISTS idx_video_vocabulary_video
    ON video_vocabulary(video_id);

CREATE INDEX IF NOT EXISTS idx_video_vocabulary_word
    ON video_vocabulary(word_id);

CREATE INDEX IF NOT EXISTS idx_video_vocabulary_saved
    ON video_vocabulary(is_saved)
    WHERE is_saved = TRUE;


-- Create video_exercises_attempts table to track user progress on video exercises
CREATE TABLE IF NOT EXISTS video_exercise_attempts (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL REFERENCES video_content(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    exercise_type VARCHAR(50) NOT NULL,  -- comprehension, vocabulary, grammar, speaking, writing
    exercise_index INTEGER NOT NULL,     -- Index in the exercises JSON array

    user_answer TEXT,
    is_correct BOOLEAN,
    score INTEGER,  -- For speaking exercises (0-100)

    feedback TEXT,  -- AI feedback on the attempt

    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure we can track multiple attempts at same exercise
    CONSTRAINT video_exercise_attempts_check
        CHECK (exercise_type IN ('comprehension', 'vocabulary', 'grammar', 'speaking', 'writing'))
);

-- Create indexes for video_exercise_attempts
CREATE INDEX IF NOT EXISTS idx_video_exercise_attempts_video
    ON video_exercise_attempts(video_id);

CREATE INDEX IF NOT EXISTS idx_video_exercise_attempts_user
    ON video_exercise_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_video_exercise_attempts_type
    ON video_exercise_attempts(exercise_type);


-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_content_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_video_content_timestamp
    BEFORE UPDATE ON video_content
    FOR EACH ROW
    EXECUTE FUNCTION update_video_content_timestamp();


-- Add comments for documentation
COMMENT ON TABLE video_content IS 'Stores videos uploaded for language learning with Gemini 3 multimodal analysis';
COMMENT ON TABLE video_vocabulary IS 'Links vocabulary from videos to user word bank for practice';
COMMENT ON TABLE video_exercise_attempts IS 'Tracks user progress on video-based exercises';

COMMENT ON COLUMN video_content.transcript IS 'Timestamped subtitles generated by Gemini 3 Vision';
COMMENT ON COLUMN video_content.vocabulary IS 'Key vocabulary extracted from video with translations and context';
COMMENT ON COLUMN video_content.grammar_points IS 'Grammar patterns identified by Gemini 3 Pro';
COMMENT ON COLUMN video_content.exercises IS 'Auto-generated exercises (comprehension, vocabulary, grammar, speaking, writing)';
COMMENT ON COLUMN video_content.cultural_notes IS 'Cultural context and idioms explained by Gemini 3';
