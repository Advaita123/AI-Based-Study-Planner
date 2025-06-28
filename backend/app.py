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