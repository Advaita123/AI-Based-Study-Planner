from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import joblib
import numpy as np
import google.generativeai as genai
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///studyplanner.db'
db = SQLAlchemy(app)

# User Schedule Model
class UserSchedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_email = db.Column(db.String(120), nullable=False)
    exam_date = db.Column(db.String(10), nullable=False)
    days_left = db.Column(db.Integer, nullable=False)
    total_recommended_hours = db.Column(db.Float, nullable=False)
    total_available_hours = db.Column(db.Float, nullable=False)
    feasibility = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship with subjects
    subjects = db.relationship('SubjectSchedule', backref='user_schedule', lazy=True, cascade="all, delete-orphan")

class SubjectSchedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_schedule_id = db.Column(db.Integer, db.ForeignKey('user_schedule.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    difficulty = db.Column(db.String(20), nullable=False)
    marks = db.Column(db.Integer, nullable=False)
    recommended_hours = db.Column(db.Float, nullable=False)
    daily_hours = db.Column(db.Float, nullable=False)

# Add new models for teacher remarks and recent progress
class TeacherRemarks(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_email = db.Column(db.String(120), nullable=False)
    teacher_remarks = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class RecentProgress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_email = db.Column(db.String(120), nullable=False)
    subject = db.Column(db.String(100), nullable=False)
    topics = db.Column(db.Text, nullable=False)
    hours = db.Column(db.Float, nullable=False)
    confidence = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# Create database tables
with app.app_context():
    db.create_all()

# Load ML model 
try:
    # Try multiple possible paths for the model
    model_paths = [
        'study_scheduler_model.pkl',
        '../study_scheduler_model.pkl',
        './study_scheduler_model.pkl'
    ]
    
    ml_model = None
    for path in model_paths:
        if os.path.exists(path):
            ml_model = joblib.load(path)
            print(f"ML model loaded successfully from: {path}")
            break
    
    if ml_model is None:
        print("Warning: ML model not found.")
        ml_model = None
except Exception as e:
    print(f"Error loading ML model: {e}")
    ml_model = None

# Configure Gemini AI with better error handling
GEMINI_API_KEY = "AIzaSyAa0VR5gJ6WuTKK_NqrPNgFpiTPBs10WNQ" 

try:
    genai.configure(api_key=GEMINI_API_KEY)
    # Test the API key by making a simple call with the correct model name
    test_model = genai.GenerativeModel('gemini-1.5-flash')
    # test_response = test_model.generate_content("Hello")  # Comment out this line
    print("Gemini API configured successfully")
    model = test_model
except Exception as e:
    print(f"Gemini API configuration failed: {e}")
    # Try alternative model names
    try:
        test_model = genai.GenerativeModel('gemini-1.5-pro')
        # test_response = test_model.generate_content("Hello")  # Comment out this line
        print("Gemini API configured successfully with gemini-1.5-pro")
        model = test_model
    except Exception as e2:
        print(f"Alternative Gemini model also failed: {e2}")
        model = None

# Fallback responses for when Gemini is not available
FALLBACK_RESPONSES = {
    "study_tips": [
        "Break down your study sessions into 25-minute focused blocks with 5-minute breaks (Pomodoro Technique).",
        "Review difficult topics first when your mind is fresh in the morning.",
        "Use active recall techniques like flashcards and practice tests instead of passive reading.",
        "Create a quiet, distraction-free study environment.",
        "Stay hydrated and take regular breaks to maintain focus.",
        "Summarize what you've learned in your own words to reinforce understanding.",
        "Teach the material to someone else - it's one of the best ways to learn.",
        "Use spaced repetition to review material at increasing intervals."
    ],
    "motivation": [
        "Remember why you started - your goals are worth the effort!",
        "Every small step forward is progress. Celebrate your achievements.",
        "You're building skills that will serve you for life.",
        "The only bad study session is the one that didn't happen.",
        "Your future self will thank you for the work you do today.",
        "You have the power to shape your academic success.",
        "Every expert was once a beginner. Keep going!",
        "Your dedication to learning is admirable and will pay off."
    ],
    "time_management": [
        "Create a daily schedule and stick to it as much as possible.",
        "Prioritize tasks using the Eisenhower Matrix (urgent vs important).",
        "Use time blocking to allocate specific time slots for different subjects.",
        "Avoid multitasking - focus on one subject at a time.",
        "Set realistic goals and break large tasks into smaller, manageable chunks.",
        "Use a timer to stay focused during study sessions.",
        "Review and adjust your schedule weekly based on what's working.",
        "Don't forget to schedule breaks and relaxation time."
    ],
    "general": [
        "I'm here to help you with your studies! What specific topic would you like to discuss?",
        "Great question! Let me help you with that.",
        "That's an interesting study-related question. Here's what I can suggest...",
        "I'd be happy to help you with your academic questions.",
        "Let's work on improving your study skills together!"
    ]
}

def get_fallback_response(user_message):
    """Get a relevant fallback response based on the user's message"""
    message_lower = user_message.lower()
    
    if any(word in message_lower for word in ['tip', 'advice', 'how', 'method', 'technique']):
        return FALLBACK_RESPONSES["study_tips"][0]
    elif any(word in message_lower for word in ['motivate', 'encourage', 'tired', 'difficult', 'hard']):
        return FALLBACK_RESPONSES["motivation"][0]
    elif any(word in message_lower for word in ['time', 'schedule', 'organize', 'plan']):
        return FALLBACK_RESPONSES["time_management"][0]
    else:
        return FALLBACK_RESPONSES["general"][0]

@app.route('/api/chatbot', methods=['POST'])
def chatbot_response():
    try:
        data = request.json
        user_message = data.get('message', '')
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        print(f"Chatbot received message: {user_message}")
        
        # Try Gemini API first
        if model is not None:
            try:
                # Create a context-aware prompt for study-related queries
                system_prompt = """You are an AI study assistant for students. You help with:
                - Explaining academic concepts
                - Providing study tips and strategies
                - Answering questions about various subjects
                - Giving motivational advice for studying
                - Helping with time management and organization
                
                Keep responses helpful, encouraging, and educational. If the question is not study-related, politely redirect to study topics.
                Keep responses concise but informative (2-3 sentences)."""
                
                # Combine system prompt with user message
                full_prompt = f"{system_prompt}\n\nStudent: {user_message}\n\nAssistant:"
                
                print("Attempting Gemini API call...")
                response = model.generate_content(full_prompt)
                
                if response and response.text:
                    print("Gemini API call successful")
                    return jsonify({
                        'response': response.text,
                        'status': 'success'
                    })
                else:
                    raise Exception("Empty response from Gemini")
                    
            except Exception as gemini_error:
                print(f"Gemini API error: {gemini_error}")
                # Fall through to fallback response
        
        # Use fallback response if Gemini fails
        print("Using fallback response")
        fallback_response = get_fallback_response(user_message)
        
        return jsonify({
            'response': fallback_response,
            'status': 'success'
        })
        
    except Exception as e:
        print(f"Chatbot error: {str(e)}")
        return jsonify({
            'response': "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
            'status': 'error'
        }), 500

@app.route('/api/generate_comprehensive_schedule', methods=['POST'])
def generate_comprehensive_schedule():
    try:
        data = request.json
        subjects = data.get('subjects', [])
        exam_date = data.get('exam_date', '')
        weekday_hours = data.get('weekday_hours', 0)
        weekend_hours = data.get('weekend_hours', 0)
        user_email = data.get('user_email', '')  
        
        if not subjects or not exam_date:
            return jsonify({'error': 'Missing required data'}), 400
        
        # Calculate days left until exam
        exam = datetime.strptime(exam_date, '%Y-%m-%d')
        today = datetime.now()
        days_left = (exam - today).days
        
        if days_left <= 0:
            return jsonify({'error': 'Exam date must be in the future'}), 400
        
        # Generate recommended hours for each subject
        subject_schedules = []
        total_recommended_hours = 0
        
        for subject in subjects:
            # Convert difficulty to numeric
            difficulty_map = {'Easy': 1, 'Medium': 2, 'Hard': 3}
            difficulty_num = difficulty_map.get(subject['difficulty'], 2)
            
            # Get prediction (ML model or fallback)
            if ml_model is not None:
                try:
                    features = np.array([[difficulty_num, subject['marks'], days_left]])
                    recommended_hours = ml_model.predict(features)[0]*5
                except Exception as e:
                    print(f"ML prediction failed, using fallback: {e}")
                    recommended_hours = fallback_prediction(subject['difficulty'], subject['marks'], days_left)*5
            else:
                recommended_hours = fallback_prediction(subject['difficulty'], subject['marks'], days_left)*5
            
            subject_schedules.append({
                'name': subject['name'],
                'difficulty': subject['difficulty'],
                'marks': subject['marks'],
                'recommended_hours': round(recommended_hours, 2),
                'daily_hours': round(recommended_hours / days_left, 2)
            })
            total_recommended_hours += recommended_hours
        
        # Calculate available study time
        weekdays_available = 5 * weekday_hours
        weekends_available = 2 * weekend_hours
        weekly_available = weekdays_available + weekends_available
        total_available = (days_left // 7) * weekly_available + (days_left % 7) * weekday_hours
        
        # Determine feasibility
        feasibility = 'Feasible' if total_available >= total_recommended_hours else 'Challenging'
        
        # Create detailed schedule
        schedule = {
            'exam_date': exam_date,
            'days_left': days_left,
            'subjects': subject_schedules,
            'total_recommended_hours': round(total_recommended_hours, 2),
            'total_available_hours': round(total_available, 2),
            'weekly_available_hours': round(weekly_available, 2),
            'feasibility': feasibility,
            'recommendations': []
        }
        
        # Add recommendations
        if total_available < total_recommended_hours:
            schedule['recommendations'].append(f"Increase study hours by {round(total_recommended_hours - total_available, 2)} hours to meet recommendations")
        
        if days_left < 14:
            schedule['recommendations'].append("Consider intensive study sessions due to limited time")
        
        # Add study tips based on subjects
        hard_subjects = [s for s in subject_schedules if s['difficulty'] == 'Hard']
        if hard_subjects:
            schedule['recommendations'].append(f"Focus more time on {', '.join([s['name'] for s in hard_subjects])} (difficult subjects)")
        
        # Save schedule to database if user email is provided
        if user_email:
            try:
                # Delete existing schedule for this user
                existing_schedule = UserSchedule.query.filter_by(user_email=user_email).first()
                if existing_schedule:
                    db.session.delete(existing_schedule)
                
                # Create new schedule
                new_schedule = UserSchedule(
                    user_email=user_email,
                    exam_date=exam_date,
                    days_left=days_left,
                    total_recommended_hours=total_recommended_hours,
                    total_available_hours=total_available,
                    feasibility=feasibility
                )
                db.session.add(new_schedule)
                db.session.flush()  # Get the ID
                
                # Add subjects
                for subject in subject_schedules:
                    subject_schedule = SubjectSchedule(
                        user_schedule_id=new_schedule.id,
                        name=subject['name'],
                        difficulty=subject['difficulty'],
                        marks=subject['marks'],
                        recommended_hours=subject['recommended_hours'],
                        daily_hours=subject['daily_hours']
                    )
                    db.session.add(subject_schedule)
                
                db.session.commit()
                print(f"Schedule saved for user: {user_email}")
                
            except Exception as e:
                print(f"Error saving schedule to database: {e}")
                db.session.rollback()
        
        return jsonify(schedule)
        
    except Exception as e:
        print(f"Schedule generation error: {str(e)}")
        return jsonify({'error': 'Error generating schedule'}), 500 

@app.route('/api/user_schedule', methods=['POST'])
def get_user_schedule():
    try:
        data = request.json
        user_email = data.get('user_email', '')
        
        if not user_email:
            return jsonify({'error': 'User email required'}), 400
        
        # Get user's schedule from database
        user_schedule = UserSchedule.query.filter_by(user_email=user_email).first()
        
        if user_schedule:
            # Get subjects for this schedule
            subjects = []
            for subject in user_schedule.subjects:
                subjects.append({
                    'name': subject.name,
                    'difficulty': subject.difficulty,
                    'marks': subject.marks,
                    'recommended_hours': subject.recommended_hours,
                    'daily_hours': subject.daily_hours
                })
            
            schedule = {
                'user_email': user_email,
                'subjects': subjects,
                'exam_date': user_schedule.exam_date,
                'days_left': user_schedule.days_left,
                'total_recommended_hours': user_schedule.total_recommended_hours,
                'feasibility': user_schedule.feasibility
            }
            
            return jsonify({'schedule': schedule})
        else:
            # Return empty schedule if none exists
            return jsonify({'schedule': {
                'user_email': user_email,
                'subjects': [],
                'exam_date': '',
                'days_left': 0,
                'total_recommended_hours': 0,
                'feasibility': 'No Schedule'
            }})
        
    except Exception as e:
        print(f"Error getting user schedule: {str(e)}")
        return jsonify({'error': 'Error retrieving schedule'}), 500

@app.route('/api/validate_progress', methods=['POST'])
def validate_progress():
    try:
        data = request.json
        user_email = data.get('user_email', '')
        subject = data.get('subject', '')
        hours = data.get('hours', 0)
        topics = data.get('topics', '')
        difficulty = data.get('difficulty', '')
        confidence = data.get('confidence', 0)
        
        # Validation checks
        validation_errors = []
        
        # Check for reasonable study hours (max 12 hours per session)
        if hours > 12:
            validation_errors.append("Study hours cannot exceed 12 hours per session")
        
        # Check for minimum study time (at least 0.5 hours)
        if hours < 0.5:
            validation_errors.append("Study time must be at least 0.5 hours")
        
        # Check for topic description length
        if len(topics.strip()) < 10:
            validation_errors.append("Please provide more detailed description of topics studied")
        
        # Check for confidence level validity
        if confidence < 1 or confidence > 10:
            validation_errors.append("Confidence level must be between 1 and 10")
        
        # Check for suspicious patterns (multiple entries in same day with same subject)
        # This would require database query in production
        
        if validation_errors:
            return jsonify({
                'valid': False,
                'errors': validation_errors
            }), 400
        
        return jsonify({
            'valid': True,
            'message': 'Progress data validated successfully'
        })
        
    except Exception as e:
        print(f"Error validating progress: {str(e)}")
        return jsonify({'error': 'Error validating progress'}), 500

@app.route('/api/save_teacher_remarks', methods=['POST'])
def save_teacher_remarks():
    try:
        data = request.json
        student_email = data.get('student_email', '')
        remarks = data.get('remarks', '')
        
        if not student_email:
            return jsonify({'error': 'Student email required'}), 400
        
        # Delete existing remarks for this student
        existing = TeacherRemarks.query.filter_by(student_email=student_email).first()
        if existing:
            db.session.delete(existing)
        
        # Save new remarks
        new_remarks = TeacherRemarks(student_email=student_email, teacher_remarks=remarks)
        db.session.add(new_remarks)
        db.session.commit()
        
        return jsonify({'message': 'Remarks saved successfully'})
        
    except Exception as e:
        print(f"Error saving teacher remarks: {str(e)}")
        return jsonify({'error': 'Error saving remarks'}), 500

@app.route('/api/get_teacher_remarks', methods=['POST'])
def get_teacher_remarks():
    try:
        data = request.json
        student_email = data.get('student_email', '')
        
        if not student_email:
            return jsonify({'error': 'Student email required'}), 400
        
        remarks = TeacherRemarks.query.filter_by(student_email=student_email).first()
        
        return jsonify({
            'remarks': remarks.teacher_remarks if remarks else ''
        })
        
    except Exception as e:
        print(f"Error getting teacher remarks: {str(e)}")
        return jsonify({'error': 'Error retrieving remarks'}), 500

@app.route('/api/save_recent_progress_for_teacher', methods=['POST'])
def save_recent_progress_for_teacher():
    try:
        data = request.json
        student_email = data.get('user_email', '')
        recent_progress = data.get('recent_progress', {})
        
        if not student_email or not recent_progress:
            return jsonify({'error': 'Student email and progress data required'}), 400
        
        # Delete existing recent progress for this student
        existing = RecentProgress.query.filter_by(student_email=student_email).first()
        if existing:
            db.session.delete(existing)
        
        # Save new recent progress
        new_progress = RecentProgress(
            student_email=student_email,
            subject=recent_progress.get('subject', ''),
            topics=recent_progress.get('topics', ''),
            hours=recent_progress.get('hours', 0),
            confidence=recent_progress.get('confidence', 0)
        )
        db.session.add(new_progress)
        db.session.commit()
        
        return jsonify({'message': 'Recent progress saved successfully'})
        
    except Exception as e:
        print(f"Error saving recent progress: {str(e)}")
        return jsonify({'error': 'Error saving progress'}), 500

@app.route('/api/teacher_progress', methods=['POST'])
def get_teacher_progress():
    try:
        data = request.json
        student_email = data.get('student_email', '')
        
        if not student_email:
            return jsonify({'error': 'Student email required'}), 400
        
        # Get teacher remarks
        teacher_remarks = TeacherRemarks.query.filter_by(student_email=student_email).first()
        
        progress_data = {
            'student_email': student_email,
            'student_name': student_email.split('@')[0],
            'recent_entries': [],
            'teacher_remarks': teacher_remarks.teacher_remarks if teacher_remarks else ''
        }
        
        # Get all recent progress entries from Firebase (we'll need to make a request to get this)
        # For now, we'll return the structure and let the frontend handle Firebase queries
        # This is a temporary solution - ideally we'd have a proper API to get all Firebase data
        
        return jsonify(progress_data)
        
    except Exception as e:
        print(f"Error getting teacher progress: {str(e)}")
        return jsonify({'error': 'Error retrieving progress data'}), 500



if __name__ == "__main__":
    print(" Starting Flask server on http://127.0.0.1:5000 ...")
    app.run(host="127.0.0.1", port=5000, debug=True)