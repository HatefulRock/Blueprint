-- Migration: Phase 4 - Community Features
-- Created: 2026-02-03
-- Description: Adds PublicDeck, DeckRating, Challenge, and ChallengeParticipant tables

-- Create public_decks table for community-shared decks
CREATE TABLE IF NOT EXISTS public_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_deck_id UUID REFERENCES decks(id) ON DELETE SET NULL,
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,

    name VARCHAR(100) NOT NULL,
    description TEXT,
    language VARCHAR(50) NOT NULL,
    level VARCHAR(10),  -- CEFR level

    -- Content snapshot
    card_count INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    preview_cards JSONB,

    -- Moderation
    status VARCHAR(20) DEFAULT 'pending',
    moderation_notes TEXT,
    moderated_at TIMESTAMP,
    moderated_by UUID REFERENCES users(id),

    -- Stats
    downloads INTEGER DEFAULT 0,
    rating_sum INTEGER DEFAULT 0,
    rating_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for public_decks
CREATE INDEX IF NOT EXISTS idx_public_decks_language ON public_decks(language);
CREATE INDEX IF NOT EXISTS idx_public_decks_status ON public_decks(status);
CREATE INDEX IF NOT EXISTS idx_public_decks_created ON public_decks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_decks_downloads ON public_decks(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_public_decks_creator ON public_decks(creator_id);

-- Create deck_ratings table
CREATE TABLE IF NOT EXISTS deck_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES public_decks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_deck_user_rating UNIQUE (deck_id, user_id)
);

-- Create indexes for deck_ratings
CREATE INDEX IF NOT EXISTS idx_deck_ratings_deck ON deck_ratings(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_ratings_user ON deck_ratings(user_id);

-- Create challenges table
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id),

    title VARCHAR(100) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(50) NOT NULL,  -- vocabulary, streak, grammar, time, mixed

    -- Goals
    target_value INTEGER NOT NULL,
    target_metric VARCHAR(50) NOT NULL,  -- words_learned, streak_days, exercises_completed, reviews_done

    -- Duration
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,

    -- Participation settings
    is_public BOOLEAN DEFAULT TRUE,
    max_participants INTEGER,
    language VARCHAR(50),

    -- Rewards
    reward_points INTEGER DEFAULT 0,
    badge_name VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for challenges
CREATE INDEX IF NOT EXISTS idx_challenges_start_date ON challenges(start_date);
CREATE INDEX IF NOT EXISTS idx_challenges_end_date ON challenges(end_date);
CREATE INDEX IF NOT EXISTS idx_challenges_public ON challenges(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_challenges_type ON challenges(challenge_type);

-- Create challenge_participants table
CREATE TABLE IF NOT EXISTS challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    current_progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,

    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_challenge_user UNIQUE (challenge_id, user_id)
);

-- Create indexes for challenge_participants
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_progress ON challenge_participants(current_progress DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_completed ON challenge_participants(completed) WHERE completed = TRUE;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_public_deck_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_public_deck_timestamp ON public_decks;
CREATE TRIGGER trigger_update_public_deck_timestamp
    BEFORE UPDATE ON public_decks
    FOR EACH ROW
    EXECUTE FUNCTION update_public_deck_timestamp();

CREATE OR REPLACE FUNCTION update_challenge_participant_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_challenge_participant_timestamp ON challenge_participants;
CREATE TRIGGER trigger_update_challenge_participant_timestamp
    BEFORE UPDATE ON challenge_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_challenge_participant_timestamp();

-- Add comments for documentation
COMMENT ON TABLE public_decks IS 'Community-shared decks available for import by other users';
COMMENT ON COLUMN public_decks.status IS 'Moderation status: pending, approved, rejected';
COMMENT ON COLUMN public_decks.preview_cards IS 'Sample cards for preview before importing';
COMMENT ON COLUMN public_decks.rating_sum IS 'Sum of all ratings for calculating average';

COMMENT ON TABLE deck_ratings IS 'User ratings and reviews for public decks';

COMMENT ON TABLE challenges IS 'Community challenges for gamification and engagement';
COMMENT ON COLUMN challenges.target_metric IS 'Metric to track: words_learned, streak_days, exercises_completed, reviews_done';
COMMENT ON COLUMN challenges.reward_points IS 'Points awarded upon completion';

COMMENT ON TABLE challenge_participants IS 'User participation and progress in challenges';
