// Function to create a subject entry form
function createSubjectEntry(index) {
    const subjectEntry = document.createElement('div');
    subjectEntry.className = 'subject-entry';
    subjectEntry.innerHTML = `
        <h3>
            Subject ${index + 1}
            <button type="button" class="remove-subject" onclick="removeSubject(this)">
                <i class="fas fa-times"></i>
            </button>
        </h3>
        <div class="subject-grid">
            <div class="form-group">
                <label for="subject-name-${index}">Subject Name</label>
                <input type="text" id="subject-name-${index}" required>
            </div>
            <div class="form-group">
                <label for="difficulty-${index}">Difficulty Level</label>
                <select id="difficulty-${index}" class="difficulty-select" required>
                    <option value="">Select difficulty</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>
            </div>
            <div class="form-group">
                <label for="past-performance-${index}">Past Performance (0-100)</label>
                <input type="number" id="past-performance-${index}" min="0" max="100" required>
            </div>
        </div>
    `;
    return subjectEntry;
}

// Function to remove a subject entry
function removeSubject(button) {
    const subjectEntry = button.closest('.subject-entry');
    subjectEntry.remove();
}

// Handle number of subjects input
document.getElementById('num-subjects').addEventListener('change', function(e) {
    const numSubjects = parseInt(e.target.value);
    const subjectsList = document.getElementById('subjects-list');
    subjectsList.innerHTML = ''; // Clear existing subjects

    // Create new subject entries
    for (let i = 0; i < numSubjects; i++) {
        subjectsList.appendChild(createSubjectEntry(i));
    }
});

// Handle form submission
document.getElementById('scheduler-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = {
        subjects: [],
        examDate: document.getElementById('exam-date').value,
        studyHours: document.getElementById('study-hours').value,
        studyHabits: document.getElementById('study-habits').value
    };

    // Get subject data
    document.querySelectorAll('.subject-entry').forEach(entry => {
        formData.subjects.push({
            name: entry.querySelector('.subject-name').value,
            difficulty: entry.querySelector('.difficulty-select').value,
            hours: entry.querySelector('.hours-input').value
        });
    });

    // Generate study plan using AI model
    const studyPlan = generateStudyPlan(formData);
    
    // Save study plan to localStorage
    localStorage.setItem('studyPlan', JSON.stringify(studyPlan));
    
    // Redirect to study plan page
    window.location.href = 'study_plan.html';
});

// Function to generate study plan (placeholder for AI model integration)
function generateStudyPlan(formData) {
    // This is a placeholder function that creates a sample study plan
    // In a real application, this would use the AI model we created
    const today = new Date();
    const examDate = new Date(formData.examDate);
    const totalDays = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    
    const studyPlan = {
        daily_schedule: [],
        total_days: totalDays,
        subjects: formData.subjects
    };

    // Generate daily schedule
    for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + i);
        
        const daySchedule = {
            date: currentDate.toISOString().split('T')[0],
            subjects: []
        };

        // Distribute subjects across the day
        formData.subjects.forEach(subject => {
            daySchedule.subjects.push({
                name: subject.name,
                hours: subject.hours,
                date: currentDate.toISOString().split('T')[0]
            });
        });

        studyPlan.daily_schedule.push(daySchedule);
    }

    return studyPlan;
}

// Function to validate form data
function validateFormData(data) {
    // Validate number of subjects
    if (data.numSubjects < 1 || data.numSubjects > 10) {
        alert('Please enter a valid number of subjects (1-10)');
        return false;
    }

    // Validate exam date
    const examDate = new Date(data.examDate);
    const today = new Date();
    if (examDate < today) {
        alert('Exam date cannot be in the past');
        return false;
    }

    // Validate study hours
    if (data.weekdayHours < 1 || data.weekdayHours > 12) {
        alert('Please enter valid weekday study hours (1-12)');
        return false;
    }
    if (data.weekendHours < 1 || data.weekendHours > 12) {
        alert('Please enter valid weekend study hours (1-12)');
        return false;
    }

    // Validate subjects
    for (let subject of data.subjects) {
        if (!subject.name.trim()) {
            alert('Please enter all subject names');
            return false;
        }
        if (!subject.difficulty) {
            alert('Please select difficulty level for all subjects');
            return false;
        }
        if (subject.pastPerformance < 0 || subject.pastPerformance > 100) {
            alert('Please enter valid past performance scores (0-100)');
            return false;
        }
    }

    return true;
}

// Set minimum date for exam date input to today
document.getElementById('exam-date').min = new Date().toISOString().split('T')[0]; 