# Progress Tracking System

## Overview

The Progress Tracking System is a comprehensive feature that allows students to log their study progress and enables teachers to monitor student performance. The system includes validation mechanisms to prevent false information and provides detailed analytics.

## Features

### Student Features
- **Progress Logging**: Students can log their daily study sessions with detailed information
- **Subject Selection**: Choose from their generated schedule subjects
- **Study Metrics**: Track hours studied, topics covered, difficulty level, and confidence
- **Progress History**: View recent study sessions and progress over time
- **Analytics**: Visual charts showing weekly study patterns and subject performance
- **Validation**: Built-in validation to ensure realistic study data

### Teacher Features
- **Student Search**: Search for students by email address
- **Progress Overview**: View comprehensive student progress statistics
- **Subject-wise Analysis**: Detailed breakdown of performance by subject
- **Recent Sessions**: View recent study sessions and topics covered
- **Teacher Remarks**: Add feedback and remarks for students
- **Progress Charts**: Visual analytics for better understanding

## File Structure

```
Progress/
├── student_progress.html      # Student progress tracking page
├── progress_styles.css        # CSS styles for progress pages
├── student_progress.js        # JavaScript for student functionality
├── firebase-config.js         # Firebase configuration
└── README.md                  # This documentation

Teachers homepage/
├── teacher_home.html          # Updated teacher homepage with progress
├── teacher_progress.js        # JavaScript for teacher progress functionality
└── tHome.css                  # Updated CSS with progress styles
```

## Backend Endpoints

### `/api/user_schedule` (POST)
Retrieves a student's generated study schedule.

### `/api/validate_progress` (POST)
Validates student progress data to prevent false information.

### `/api/teacher_progress` (POST)
Retrieves comprehensive progress data for a student.

## Validation Rules

The system implements several validation rules to prevent false information:

1. **Study Hours**: Maximum 12 hours per session, minimum 0.5 hours
2. **Topic Description**: Minimum 10 characters required
3. **Confidence Level**: Must be between 1 and 10
4. **Subject Selection**: Must be from the student's generated schedule
5. **Duplicate Prevention**: Checks for multiple entries on the same day for the same subject

## Firebase Integration

The progress tracking system uses Firebase for:
- **Authentication**: User verification
- **Firestore**: Storing progress data
- **Real-time Updates**: Live progress tracking

## Usage Instructions

### For Students

1. **Access Progress Page**: Click on "Progress" in the navigation menu
2. **Log Study Session**: Fill out the progress form with detailed information
3. **Submit**: Click "Log Progress" to save your entry
4. **View History**: Check your recent progress entries and analytics

### For Teachers

1. **Access Teacher Homepage**: Navigate to the teacher dashboard
2. **Search Student**: Enter student email in the search field
3. **View Progress**: Review comprehensive student progress data
4. **Add Remarks**: Provide feedback in the remarks section
5. **Analyze Charts**: Use visual analytics for better understanding

## Security Features

1. **Authentication Required**: All progress operations require user authentication
2. **Email Validation**: Student search requires valid email format
3. **Data Validation**: Backend validation prevents invalid data submission
4. **Rate Limiting**: Prevents excessive progress submissions
5. **Input Sanitization**: All user inputs are sanitized

## Technical Requirements

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Python Flask
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **Charts**: Chart.js
- **Icons**: Font Awesome 6.0 