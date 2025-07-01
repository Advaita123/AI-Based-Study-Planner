// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    updateDate();
    initializeSearch();
});

// Update current date
function updateDate() {
    const date = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = date.toLocaleDateString('en-US', options);
}

// Initialize search functionality
function initializeSearch() {
    const searchBtn = document.getElementById('search-student');
    const studentEmailInput = document.getElementById('student-email');
    
    searchBtn.addEventListener('click', function() {
        const studentEmail = studentEmailInput.value.trim();
        if (studentEmail) {
            searchStudentProgress(studentEmail);
        } else {
            showMessage('Please enter a student email address.', 'error');
        }
    });
    
    // Allow Enter key to trigger search
    studentEmailInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });
}

// Search for student progress
async function searchStudentProgress(studentEmail) {
    const searchBtn = document.getElementById('search-student');
    const originalText = searchBtn.innerHTML;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    searchBtn.disabled = true;
    
    try {
        const response = await fetch('http://localhost:5000/api/teacher_progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                student_email: studentEmail
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            displayStudentProgress(data);
        } else {
            const errorData = await response.json();
            showNoResults();
            showMessage(errorData.error || 'Student not found.', 'error');
        }
    } catch (error) {
        console.error('Error searching student:', error);
        showNoResults();
        showMessage('Error connecting to server. Please try again.', 'error');
    } finally {
        searchBtn.innerHTML = originalText;
        searchBtn.disabled = false;
    }
}

// Display student progress
function displayStudentProgress(data) {
    // Hide no results message
    document.getElementById('no-results').style.display = 'none';
    
    // Show progress section
    document.getElementById('progress-section').style.display = 'block';
    
    // Update student name
    document.getElementById('student-name-display').textContent = data.student_name;
    
    // Update overview cards
    document.getElementById('total-study-hours').textContent = `${data.total_study_hours} hours`;
    document.getElementById('completion-rate').textContent = `${data.completion_rate}%`;
    document.getElementById('study-streak').textContent = `${data.study_streak} days`;
    document.getElementById('active-sessions').textContent = data.subjects.reduce((sum, subject) => sum + subject.sessions, 0);
    
    // Display subject-wise progress
    displaySubjectProgress(data.subjects);
    
    // Display recent entries
    displayRecentEntries(data.recent_entries);
    
    // Create charts
    createProgressCharts(data);
    
    // Show success message
    showMessage(`Progress loaded for ${data.student_name}`, 'success');
}

// Display subject-wise progress
function displaySubjectProgress(subjects) {
    const subjectsGrid = document.getElementById('subjects-grid');
    subjectsGrid.innerHTML = '';
    
    subjects.forEach(subject => {
        const subjectCard = document.createElement('div');
        subjectCard.className = 'subject-card';
        
        const confidenceColor = getConfidenceColor(subject.average_confidence);
        
        subjectCard.innerHTML = `
            <div class="subject-header">
                <h4>${subject.name}</h4>
                <span class="confidence-badge" style="background-color: ${confidenceColor}">
                    ${subject.average_confidence.toFixed(1)}/10
                </span>
            </div>
            <div class="subject-stats">
                <div class="stat-item">
                    <i class="fas fa-clock"></i>
                    <span>${subject.total_hours} hours</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-calendar-check"></i>
                    <span>${subject.sessions} sessions</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-chart-line"></i>
                    <span>${(subject.total_hours / subject.sessions).toFixed(1)} avg/session</span>
                </div>
            </div>
        `;
        
        subjectsGrid.appendChild(subjectCard);
    });
}

// Display recent entries
function displayRecentEntries(entries) {
    const recentEntries = document.getElementById('recent-entries');
    recentEntries.innerHTML = '';
    
    if (entries.length === 0) {
        recentEntries.innerHTML = '<p class="no-entries">No recent study sessions found.</p>';
        return;
    }
    
    entries.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'entry-card';
        
        entryDiv.innerHTML = `
            <div class="entry-header">
                <span class="entry-subject">${entry.subject}</span>
                <span class="entry-date">${entry.date}</span>
            </div>
            <div class="entry-details">
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${entry.hours} hours</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-thumbs-up"></i>
                    <span>Confidence: ${entry.confidence}/10</span>
                </div>
            </div>
            <div class="entry-topics">
                <strong>Topics:</strong> ${entry.topics}
            </div>
        `;
        
        recentEntries.appendChild(entryDiv);
    });
}

// Create progress charts
function createProgressCharts(data) {
    createWeeklyChart(data);
    createSubjectChart(data.subjects);
}

// Create weekly study pattern chart
function createWeeklyChart(data) {
    const ctx = document.getElementById('weekly-chart').getContext('2d');
    
    // Sample weekly data (in production, this would come from the backend)
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const studyHours = [3.5, 4.2, 2.8, 5.1, 3.9, 6.2, 4.8];
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: weekDays,
            datasets: [{
                label: 'Study Hours',
                data: studyHours,
                borderColor: '#5b95cf',
                backgroundColor: 'rgba(91, 149, 207, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Create subject performance chart
function createSubjectChart(subjects) {
    const ctx = document.getElementById('subject-chart').getContext('2d');
    
    const subjectNames = subjects.map(s => s.name);
    const studyHours = subjects.map(s => s.total_hours);
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: subjectNames,
            datasets: [{
                data: studyHours,
                backgroundColor: [
                    '#5b95cf',
                    '#28a745',
                    '#ffc107',
                    '#dc3545',
                    '#6f42c1'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Get confidence color based on level
function getConfidenceColor(confidence) {
    if (confidence >= 8) return '#28a745'; // Green
    if (confidence >= 6) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
}

// Show no results message
function showNoResults() {
    document.getElementById('progress-section').style.display = 'none';
    document.getElementById('no-results').style.display = 'block';
}

// Show message
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(messageDiv, container.firstChild);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Handle teacher remarks
document.getElementById('save-remarks').addEventListener('click', function() {
    const remarks = document.getElementById('teacher-remarks').value.trim();
    if (remarks) {
        // In production, save remarks to database
        showMessage('Remarks saved successfully!', 'success');
    } else {
        showMessage('Please enter some remarks before saving.', 'error');
    }
}); 