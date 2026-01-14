from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, User, Word, Goal, Deck
import os
from datetime import datetime, timedelta
import pypdf
import io
import csv

app = Flask(__name__)
CORS(app)

# Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'blueprint.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Create tables on startup
with app.app_context():
    db.create_all()

def get_or_create_user():
    user = User.query.first()
    if not user:
        user = User()
        db.session.add(user)
        db.session.commit()
        # Default goals
        goal = Goal(user_id=user.id)
        db.session.add(goal)
        db.session.commit()
    return user

def check_weekly_reset(user):
    if not user.week_start_date:
        user.week_start_date = datetime.utcnow()
        db.session.commit()
        return

    now = datetime.utcnow()
    # Simple check: if current time is > 7 days from start
    delta = now - user.week_start_date
    if delta.days >= 7:
        user.new_words_this_week = 0
        user.practice_sessions_this_week = 0
        user.week_start_date = now
        db.session.commit()

@app.route('/api/profile', methods=['GET'])
def profile():
    user = get_or_create_user()
    check_weekly_reset(user)
    return jsonify({
        'points': user.points,
        'streak': user.streak,
        'goalProgress': {
            'newWordsThisWeek': user.new_words_this_week,
            'practiceSessionsThisWeek': user.practice_sessions_this_week,
            'weekStartDate': user.week_start_date.isoformat()
        }
    })

@app.route('/api/goals', methods=['GET', 'POST'])
def goals():
    user = get_or_create_user()
    goal = Goal.query.filter_by(user_id=user.id).first()
    if not goal:
        goal = Goal(user_id=user.id)
        db.session.add(goal)
        db.session.commit()

    if request.method == 'POST':
        data = request.json
        goal.words_per_week = data.get('wordsPerWeek', goal.words_per_week)
        goal.practice_sessions_per_week = data.get('practiceSessionsPerWeek', goal.practice_sessions_per_week)
        db.session.commit()

    return jsonify({
        'wordsPerWeek': goal.words_per_week,
        'practiceSessionsPerWeek': goal.practice_sessions_per_week
    })

@app.route('/api/words', methods=['GET'])
def get_words():
    language = request.args.get('language', 'Spanish') # Default fallback
    deck_id = request.args.get('deckId')
    
    query = Word.query.filter_by(language=language)
    if deck_id:
        query = query.filter_by(deck_id=deck_id)
        
    words = query.all()
    return jsonify([w.to_dict() for w in words])

@app.route('/api/words', methods=['POST'])
def save_word():
    data = request.json
    user = get_or_create_user()
    check_weekly_reset(user)

    term = data.get('term')
    language = data.get('language')
    
    if not term or not language:
        return jsonify({'error': 'Missing term or language'}), 400

    existing = Word.query.filter_by(term=term, language=language).first()
    if existing:
        return jsonify(existing.to_dict())

    analysis = data.get('analysis', {})
    new_word = Word(
        term=term,
        context=data.get('context', ''),
        language=language,
        familiarity_score=1,
        translation=analysis.get('translation', ''),
        literal_translation=analysis.get('literalTranslation', ''),
        grammatical_breakdown=analysis.get('grammaticalBreakdown', ''),
        part_of_speech=analysis.get('partOfSpeech', ''),
        next_review_date=datetime.utcnow(), # Due immediately upon creation
        deck_id=data.get('deckId') # Optional
    )

    db.session.add(new_word)
    user.new_words_this_week += 1
    user.points += 10
    db.session.commit()

    return jsonify(new_word.to_dict())

@app.route('/api/words/<term>/familiarity', methods=['PUT'])
def update_familiarity(term):
    language = request.args.get('language')
    data = request.json
    change = data.get('change')

    word = Word.query.filter_by(term=term, language=language).first()
    if not word:
        return jsonify({'error': 'Word not found'}), 404

    # Update score
    new_score = word.familiarity_score + change
    word.familiarity_score = max(1, min(5, new_score))
    
    # SRS Algorithm (Simplified Leitner)
    now = datetime.utcnow()
    word.last_reviewed_date = now

    if change > 0:
        # Correct answer: Increase interval based on score
        # Score 1: 1 day, 2: 3 days, 3: 7 days, 4: 14 days, 5: 30 days
        intervals = {1: 1, 2: 3, 3: 7, 4: 14, 5: 30}
        days_to_add = intervals.get(word.familiarity_score, 1)
        word.next_review_date = now + timedelta(days=days_to_add)
        
        user = get_or_create_user()
        user.points += 5
    else:
        # Incorrect answer: Reset to review immediately/tomorrow
        word.next_review_date = now 
    
    db.session.commit()
    return jsonify(word.to_dict())

@app.route('/api/session/complete', methods=['POST'])
def complete_session():
    user = get_or_create_user()
    check_weekly_reset(user)
    
    data = request.json
    # type = data.get('type') 
    
    user.practice_sessions_this_week += 1
    user.points += 50
    db.session.commit()
    
    return jsonify({
        'points': user.points,
        'streak': user.streak,
        'goalProgress': {
            'newWordsThisWeek': user.new_words_this_week,
            'practiceSessionsThisWeek': user.practice_sessions_this_week,
            'weekStartDate': user.week_start_date.isoformat()
        }
    })

@app.route('/api/study-plan', methods=['GET'])
def study_plan():
    language = request.args.get('language', 'Spanish')
    
    # Select reading content based on language
    # IDs correspond to curatedContent.ts in frontend
    text_id = 'a2-1' # default spanish
    text_title = 'Un Día en la Ciudad'
    
    if language == 'Chinese':
        text_id = 'zh-a1-1'
        text_title = '我的家庭 (My Family)'
    elif language == 'French':
        text_id = 'fr-a1-1'
        text_title = 'Ma Famille'
    elif language == 'German':
        text_id = 'de-a1-1' # Placeholder if German content exists
        text_title = 'Meine Familie'

    return jsonify({
        'date': datetime.utcnow().isoformat(),
        'summary': f"Today's focus is on improving your {language} vocabulary and comprehension.",
        'tasks': [
            {
                'id': '1',
                'title': 'Review Flashcards',
                'description': f'Review your recently learned {language} words.',
                'type': 'flashcards',
                'targetView': 'flashcards',
                'isCompleted': False
            },
            {
                'id': '2',
                'title': f"Read '{text_title}'",
                'description': 'Practice your reading comprehension.',
                'type': 'read',
                'targetView': 'reader',
                'isCompleted': False,
                'metadata': { 'textId': text_id }
            },
            {
                'id': '3',
                'title': 'Practice Conversation',
                'description': 'Chat with the AI tutor.',
                'type': 'conversation',
                'targetView': 'conversation',
                'isCompleted': False
            }
        ]
    })

@app.route('/api/upload-file', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        text = ""
        if file.filename.endswith('.pdf'):
            pdf_reader = pypdf.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() or ""
        else:
            text = file.read().decode('utf-8', errors='replace')
            
        return jsonify({'text': text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- DECK API ROUTES ---

@app.route('/api/decks', methods=['GET'])
def get_decks():
    language = request.args.get('language')
    if language:
        decks = Deck.query.filter_by(language=language).all()
    else:
        decks = Deck.query.all()
    return jsonify([d.to_dict() for d in decks])

@app.route('/api/decks', methods=['POST'])
def create_deck():
    data = request.json
    name = data.get('name')
    language = data.get('language')
    
    if not name or not language:
        return jsonify({'error': 'Missing name or language'}), 400
        
    deck = Deck(name=name, language=language)
    db.session.add(deck)
    db.session.commit()
    return jsonify(deck.to_dict())

@app.route('/api/decks/import', methods=['POST'])
def import_deck():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    language = request.form.get('language')
    deck_name = request.form.get('name', 'Imported Deck')
    
    if not file or not language:
        return jsonify({'error': 'Missing file or language'}), 400

    # Create Deck
    deck = Deck(name=deck_name, language=language)
    db.session.add(deck)
    db.session.commit()

    # Parse CSV/TXT
    # Assuming format: Term, Translation (optional context)
    # Separator: comma or tab
    imported_count = 0
    
    try:
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        # Sniff to determine delimiter (comma or tab)
        sample = stream.read(1024)
        stream.seek(0)
        sniffer = csv.Sniffer()
        try:
            dialect = sniffer.sniff(sample)
        except csv.Error:
            dialect = csv.excel # Fallback
            
        csv_reader = csv.reader(stream, dialect)
        
        user = get_or_create_user()
        
        for row in csv_reader:
            if len(row) < 2:
                continue
            
            term = row[0].strip()
            translation = row[1].strip()
            context = row[2].strip() if len(row) > 2 else f"Context for {term}"
            
            if not term:
                continue
                
            # Check duplicate
            if Word.query.filter_by(term=term, language=language).first():
                continue
                
            new_word = Word(
                term=term,
                translation=translation,
                context=context,
                language=language,
                deck_id=deck.id,
                familiarity_score=1,
                grammatical_breakdown="Imported from Anki/Deck",
                next_review_date=datetime.utcnow()
            )
            db.session.add(new_word)
            imported_count += 1
            
        user.new_words_this_week += imported_count
        db.session.commit()
        
        return jsonify({
            'deck': deck.to_dict(),
            'importedCount': imported_count
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)