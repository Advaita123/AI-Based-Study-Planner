// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    updateDate();
    initializeSearch();
    initializeRemarks();
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

// Initialize teacher remarks functionality
function initializeRemarks() {
    const saveRemarksBtn = document.getElementById('save-remarks');
    if (saveRemarksBtn) {
        saveRemarksBtn.addEventListener('click', saveTeacherRemarks);
    }
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
            displayStudentProgress(data, studentEmail);
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
function displayStudentProgress(data, studentEmail) {
    // Hide no results message
    document.getElementById('no-results').style.display = 'none';
    
    // Show progress section
    document.getElementById('progress-section').style.display = 'block';
    
    // Update student name
    document.getElementById('student-name-display').textContent = studentEmail;
    
    // Update overview cards
    document.getElementById('total-study-hours').textContent = `${data.statistics.total_hours.toFixed(1)} hours`;
    document.getElementById('completion-rate').textContent = `${data.statistics.completion_rate}%`;
    document.getElementById('study-streak').textContent = `${data.statistics.study_streak} days`;
    document.getElementById('active-sessions').textContent = data.statistics.active_sessions;
    
    // Display subject-wise progress
    displaySubjectProgress(data.schedule.subjects, data.progress);
    
    // Display recent entries
    displayRecentEntries(data.progress);
    
    // Load teacher remarks
    loadTeacherRemarks(data.teacher_remarks);
    
    // Create charts
    createProgressCharts(data);
    
    // Store student email for remarks
    document.getElementById('progress-section').setAttribute('data-student-email', studentEmail);
    
    // Show success message
    showMessage(`Progress loaded for ${studentEmail}`, 'success');
}

// Display subject-wise progress
function displaySubjectProgress(subjects, progressData) {
    const subjectsGrid = document.getElementById('subjects-grid');
    subjectsGrid.innerHTML = '';
    
    subjects.forEach(subject => {
        // Calculate subject-specific statistics
        const subjectProgress = progressData.filter(entry => entry.subject === subject.name);
        const totalHours = subjectProgress.reduce((sum, entry) => sum + entry.hours, 0);
        const sessions = subjectProgress.length;
        const avgConfidence = sessions > 0 ? 
            subjectProgress.reduce((sum, entry) => sum + entry.confidence, 0) / sessions : 0;
        
        const subjectCard = document.createElement('div');
        subjectCard.className = 'subject-card';
        
        const confidenceColor = getConfidenceColor(avgConfidence);
        
        subjectCard.innerHTML = `
            <div class="subject-header">
                <h4>${subject.name}</h4>
                <span class="confidence-badge" style="background-color: ${confidenceColor}">
                    ${avgConfidence.toFixed(1)}/10
                </span>
            </div>
            <div class="subject-stats">
                <div class="stat-item">
                    <i class="fas fa-clock"></i>
                    <span>${totalHours.toFixed(1)} hours</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-calendar-check"></i>
                    <span>${sessions} sessions</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-chart-line"></i>
                    <span>${sessions > 0 ? (totalHours / sessions).toFixed(1) : 0} avg/session</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Difficulty: ${subject.difficulty}</span>
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
    
    // Take the 10 most recent entries
    const recentEntriesList = entries.slice(0, 10);
    
    recentEntriesList.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'entry-card';
        
        const formattedDate = formatDate(entry.date);
        
        entryDiv.innerHTML = `
            <div class="entry-header">
                <span class="entry-subject">${entry.subject}</span>
                <span class="entry-date">${formattedDate}</span>
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
                <div class="detail-item">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Difficulty: ${entry.difficulty}</span>
                </div>
            </div>
            <div class="entry-description">
                <strong>Topics covered:</strong> ${entry.description}
            </div>
        `;
        
        recentEntries.appendChild(entryDiv);
    });
}

// Load teacher remarks
function loadTeacherRemarks(remarks) {
    const remarksTextarea = document.getElementById('teacher-remarks');
    if (remarksTextarea) {
        remarksTextarea.value = remarks || '';
    }
}

// Save teacher remarks
async function saveTeacherRemarks() {
    const progressSection = document.getElementById('progress-section');
    const studentEmail = progressSection.getAttribute('data-student-email');
    const remarks = document.getElementById('teacher-remarks').value.trim();
    
    if (!studentEmail) {
        showMessage('Please search for a student first.', 'error');
        return;
    }
    
    if (!remarks) {
        showMessage('Please enter some remarks before saving.', 'warning');
        return;
    }
    
    const saveBtn = document.getElementById('save-remarks');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;
    
    try {
        const response = await fetch('http://localhost:5000/api/save_teacher_remarks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                student_email: studentEmail,
                remarks: remarks
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            showMessage('Remarks saved successfully!', 'success');
        } else {
            const errorData = await response.json();
            showMessage(errorData.error || 'Failed to save remarks.', 'error');
        }
    } catch (error) {
        console.error('Error saving remarks:', error);
        showMessage('Error connecting to server. Please try again.', 'error');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Create progress charts
function createProgressCharts(data) {
    createWeeklyChart(data.progress);
    createSubjectChart(data.schedule.subjects, data.progress);
}

// Create weekly study pattern chart
function createWeeklyChart(progressData) {
    const ctx = document.getElementById('weekly-chart');
    if (!ctx) return;
    
    // Get last 7 days of data
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
    }
    
    const dailyHours = last7Days.map(date => {
        const dayEntries = progressData.filter(entry => entry.date === date);
        return dayEntries.reduce((sum, entry) => sum + entry.hours, 0);
    });
    
    const weekDays = last7Days.map(date => {
        const day = new Date(date);
        return day.toLocaleDateString('en-US', { weekday: 'short' });
    });
    
    // Destroy existing chart if it exists
    if (window.weeklyChart) {
        window.weeklyChart.destroy();
    }
    
    window.weeklyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weekDays,
            datasets: [{
                label: 'Study Hours',
                data: dailyHours,
                borderColor: '#5b95cf',
                backgroundColor: 'rgba(91, 149, 207, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours'
                    }
                }
            }
        }
    });
}

// Create subject performance chart
function createSubjectChart(subjects, progressData) {
    const ctx = document.getElementById('subject-chart');
    if (!ctx) return;
    
    const subjectNames = subjects.map(subject => subject.name);
    const subjectHours = subjectNames.map(subjectName => {
        const subjectProgress = progressData.filter(entry => entry.subject === subjectName);
        return subjectProgress.reduce((sum, entry) => sum + entry.hours, 0);
    });
    
    const subjectConfidence = subjectNames.map(subjectName => {
        const subjectProgress = progressData.filter(entry => entry.subject === subjectName);
        if (subjectProgress.length === 0) return 0;
        return subjectProgress.reduce((sum, entry) => sum + entry.confidence, 0) / subjectProgress.length;
    });
    
    // Destroy existing chart if it exists
    if (window.subjectChart) {
        window.subjectChart.destroy();
    }
    
    window.subjectChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: subjectNames,
            datasets: [{
                label: 'Total Hours',
                data: subjectHours,
                backgroundColor: 'rgba(91, 149, 207, 0.8)',
                yAxisID: 'y'
            }, {
                label: 'Avg Confidence',
                data: subjectConfidence,
                backgroundColor: 'rgba(255, 193, 7, 0.8)',
                yAxisID: 'y1',
                type: 'line'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Hours'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Confidence (1-10)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    max: 10,
                    min: 0
                }
            }
        }
    });
}

// Get confidence color based on level
function getConfidenceColor(confidence) {
    if (confidence >= 8) return '#28a745'; // Green for high confidence
    if (confidence >= 6) return '#ffc107'; // Yellow for medium confidence
    if (confidence >= 4) return '#fd7e14'; // Orange for low-medium confidence
    return '#dc3545'; // Red for low confidence
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Show no results message
function showNoResults() {
    document.getElementById('progress-section').style.display = 'none';
    document.getElementById('no-results').style.display = 'block';
}

// Show message
function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to page
    const container = document.querySelector('.container');
    container.insertBefore(messageDiv, container.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
} 