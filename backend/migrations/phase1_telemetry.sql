-- Migration: Phase 1 - Enhanced Review Telemetry
-- Created: 2026-02-03
-- Description: Adds response time, confidence, and leech tracking fields

-- Add telemetry fields to practice_reviews
ALTER TABLE practice_reviews
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS confidence INTEGER,
ADD COLUMN IF NOT EXISTS answer_text TEXT,
ADD COLUMN IF NOT EXISTS is_correct BOOLEAN;

-- Add leech tracking to cards
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS lapses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_leech BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Add leech tracking to words
ALTER TABLE words
ADD COLUMN IF NOT EXISTS lapses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_leech BOOLEAN DEFAULT FALSE;

-- Index for finding leeches efficiently
CREATE INDEX IF NOT EXISTS idx_cards_leech ON cards(is_leech) WHERE is_leech = TRUE;
CREATE INDEX IF NOT EXISTS idx_words_leech ON words(is_leech) WHERE is_leech = TRUE;

-- Index for response time analytics
CREATE INDEX IF NOT EXISTS idx_practice_reviews_response_time
ON practice_reviews(response_time_ms)
WHERE response_time_ms IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN practice_reviews.response_time_ms IS 'Time taken to answer in milliseconds';
COMMENT ON COLUMN practice_reviews.confidence IS 'User self-reported confidence 1-5';
COMMENT ON COLUMN practice_reviews.answer_text IS 'What the user entered as their answer';
COMMENT ON COLUMN practice_reviews.is_correct IS 'Whether the answer was correct (quality >= 3)';
COMMENT ON COLUMN cards.lapses IS 'Number of times card was failed after initial learning';
COMMENT ON COLUMN cards.is_leech IS 'Flag for cards with 8+ lapses that need attention';
COMMENT ON COLUMN cards.total_reviews IS 'Lifetime count of reviews for this card';
COMMENT ON COLUMN words.lapses IS 'Number of times word was failed during review';
COMMENT ON COLUMN words.is_leech IS 'Flag for words with 8+ lapses that need attention';
