from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    points = db.Column(db.Integer, default=0)
    streak = db.Column(db.Integer, default=0)
    last_active_date = db.Column(db.Date, nullable=True)
    
    new_words_this_week = db.Column(db.Integer, default=0)
    practice_sessions_this_week = db.Column(db.Integer, default=0)
    week_start_date = db.Column(db.DateTime, default=datetime.utcnow)

class Goal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    words_per_week = db.Column(db.Integer, default=20)
    practice_sessions_per_week = db.Column(db.Integer, default=3)

class Deck(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    language = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to access words easily
    words = db.relationship('Word', backref='deck', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'language': self.language,
            'wordCount': self.words.count()
        }

class Word(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    term = db.Column(db.String(100), nullable=False)
    context = db.Column(db.Text, nullable=False)
    familiarity_score = db.Column(db.Integer, default=1)
    language = db.Column(db.String(50), nullable=False)
    
    translation = db.Column(db.String(200))
    literal_translation = db.Column(db.String(200))
    grammatical_breakdown = db.Column(db.Text)
    part_of_speech = db.Column(db.String(50)) 
    
    # SRS Fields
    next_review_date = db.Column(db.DateTime, default=datetime.utcnow)
    last_reviewed_date = db.Column(db.DateTime, nullable=True)
    
    # Deck Linking
    deck_id = db.Column(db.Integer, db.ForeignKey('deck.id'), nullable=True)

    __table_args__ = (
        db.UniqueConstraint('term', 'language', name='unique_word_per_language'),
    )

    def to_dict(self):
        return {
            'term': self.term,
            'context': self.context,
            'familiarityScore': self.familiarity_score,
            'language': self.language,
            'deckId': self.deck_id,
            'nextReviewDate': self.next_review_date.isoformat() if self.next_review_date else None,
            'lastReviewedDate': self.last_reviewed_date.isoformat() if self.last_reviewed_date else None,
            'analysis': {
                'translation': self.translation,
                'literalTranslation': self.literal_translation,
                'grammaticalBreakdown': self.grammatical_breakdown,
                'partOfSpeech': self.part_of_speech
            }
        }