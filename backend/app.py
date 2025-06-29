from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import joblib
import numpy as np
import google.generativeai as genai
import os

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///studyplanner.db'
db = SQLAlchemy(app)

# Load ML model
ml_model = joblib.load('../study_scheduler_model.pkl')

# Configure Gemini AI
GEMINI_API_KEY = "AIzaSyAa0VR5gJ6WuTKK_NqrPNgFpiTPBs10WNQ" 
genai.configure(api_key=GEMINI_API_KEY)

# Initialize Gemini model
model = genai.GenerativeModel('gemini-pro')

@app.route('/api/chatbot', methods=['POST'])
def chatbot_response():
    try:
        data = request.json
        user_message = data.get('message', '')
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Create a context-aware prompt for study-related queries
        system_prompt = """You are an AI study assistant for students. You help with:
        - Explaining academic concepts
        - Providing study tips and strategies
        - Answering questions about various subjects
        - Giving motivational advice for studying
        - Helping with time management and organization
        
        Keep responses helpful, encouraging, and educational. If the question is not study-related, politely redirect to study topics."""
        
        # Combine system prompt with user message
        full_prompt = f"{system_prompt}\n\nStudent: {user_message}\n\nAssistant:"
        
        # Generate response using Gemini
        response = model.generate_content(full_prompt)
        
        return jsonify({
            'response': response.text,
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
        
        if not subjects or not exam_date:
            return jsonify({'error': 'Missing required data'}), 400
        
        # Calculate days left until exam
        from datetime import datetime
        exam = datetime.strptime(exam_date, '%Y-%m-%d')
        today = datetime.now()
        days_left = (exam - today).days
        
        if days_left <= 0:
            return jsonify({'error': 'Exam date must be in the future'}), 400
        
        # Generate recommended hours for each subject using ML model
        subject_schedules = []
        total_recommended_hours = 0
        
        for subject in subjects:
            # Convert difficulty to numeric
            difficulty_map = {'Easy': 1, 'Medium': 2, 'Hard': 3}
            difficulty_num = difficulty_map.get(subject['difficulty'], 2)
            
            # Get ML prediction
            features = np.array([[difficulty_num, subject['marks'], days_left]])
            recommended_hours = ml_model.predict(features)[0]
            
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
        
        # Create detailed schedule
        schedule = {
            'exam_date': exam_date,
            'days_left': days_left,
            'subjects': subject_schedules,
            'total_recommended_hours': round(total_recommended_hours, 2),
            'total_available_hours': round(total_available, 2),
            'weekly_available_hours': round(weekly_available, 2),
            'feasibility': 'Feasible' if total_available >= total_recommended_hours else 'Challenging',
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
        
        # Get user's schedule from database (you can implement this based on your needs)
        # For now, return a sample schedule
        schedule = {
            'user_email': user_email,
            'subjects': [
                {
                    'name': 'Mathematics',
                    'difficulty': 'Hard',
                    'recommended_hours': 40,
                    'daily_hours': 2.5
                },
                {
                    'name': 'Physics',
                    'difficulty': 'Medium',
                    'recommended_hours': 30,
                    'daily_hours': 2.0
                },
                {
                    'name': 'Chemistry',
                    'difficulty': 'Easy',
                    'recommended_hours': 25,
                    'daily_hours': 1.5
                }
            ],
            'exam_date': '2024-06-15',
            'total_recommended_hours': 95
        }
        
        return jsonify({'schedule': schedule})
        
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

@app.route('/api/teacher_progress', methods=['POST'])
def get_teacher_progress():
    try:
        data = request.json
        student_email = data.get('student_email', '')
        
        if not student_email:
            return jsonify({'error': 'Student email required'}), 400
        
        # In production, this would query your database
        # For now, return sample progress data
        progress_data = {
            'student_email': student_email,
            'student_name': student_email.split('@')[0],
            'total_study_hours': 45.5,
            'completion_rate': 78,
            'study_streak': 7,
            'subjects': [
                {
                    'name': 'Mathematics',
                    'total_hours': 20.5,
                    'sessions': 8,
                    'average_confidence': 7.2
                },
                {
                    'name': 'Physics',
                    'total_hours': 15.0,
                    'sessions': 6,
                    'average_confidence': 6.8
                },
                {
                    'name': 'Chemistry',
                    'total_hours': 10.0,
                    'sessions': 4,
                    'average_confidence': 8.1
                }
            ],
            'recent_entries': [
                {
                    'date': '2024-01-15',
                    'subject': 'Mathematics',
                    'hours': 2.5,
                    'topics': 'Calculus integration and differentiation',
                    'confidence': 8
                },
                {
                    'date': '2024-01-14',
                    'subject': 'Physics',
                    'hours': 2.0,
                    'topics': 'Mechanics and Newton\'s laws',
                    'confidence': 7
                }
            ]
        }
        
        return jsonify(progress_data)
        
    except Exception as e:
        print(f"Error getting teacher progress: {str(e)}")
        return jsonify({'error': 'Error retrieving progress data'}), 500 