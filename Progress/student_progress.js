// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDQ2o2ZcWZaH0di-DJV9EkLw-4LomO81_Y",
    authDomain: "studyscheduler-88ae1.firebaseapp.com",
    projectId: "studyscheduler-88ae1",
    storageBucket: "studyscheduler-88ae1.firebasestorage.app",
    messagingSenderId: "789024560599",
    appId: "1:789024560599:web:08358b5764ec25f8aca792",
    measurementId: "G-M7P873NEYF"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables
let currentUser = null;
let userSchedule = null;
let progressData = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initializeConfidenceSlider();
    loadUserSchedule();
    loadProgressHistory();
});

// Check authentication
function checkAuth() {
    auth.onAuthStateChanged(function(user) {
        if (user) {
            currentUser = user;
            console.log('User authenticated:', user.email);
        } else {
            // Redirect to login if not authenticated
            window.location.href = '../Login/login.html';
        }
    });
}

// Initialize confidence slider
function initializeConfidenceSlider() {
    const slider = document.getElementById('confidence-level');
    const value = document.getElementById('confidence-value');
    
    slider.addEventListener('input', function() {
        value.textContent = this.value;
    });
}

// Load user's schedule from backend
async function loadUserSchedule() {
    try {
        const response = await fetch('http://localhost:5000/api/user_schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_email: currentUser.email
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            userSchedule = data.schedule;
            populateSubjectSelect();
            updateTodayGoal();
        } else {
            console.log('No schedule found for user');
            // Use default subjects if no schedule exists
            userSchedule = {
                subjects: [
                    { name: 'Mathematics', difficulty: 'Medium' },
                    { name: 'Physics', difficulty: 'Hard' },
                    { name: 'Chemistry', difficulty: 'Easy' },
                    { name: 'Biology', difficulty: 'Medium' }
                ]
            };
            populateSubjectSelect();
        }
    } catch (error) {
        console.error('Error loading schedule:', error);
        // Fallback to default subjects
        userSchedule = {
            subjects: [
                { name: 'Mathematics', difficulty: 'Medium' },
                { name: 'Physics', difficulty: 'Hard' },
                { name: 'Chemistry', difficulty: 'Easy' },
                { name: 'Biology', difficulty: 'Medium' }
            ]
        };
        populateSubjectSelect();
    }
}

// Populate subject select dropdown
function populateSubjectSelect() {
    const select = document.getElementById('subject-select');
    select.innerHTML = '<option value="">Select Subject</option>';
    
    if (userSchedule && userSchedule.subjects) {
        userSchedule.subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.name;
            option.textContent = subject.name;
            select.appendChild(option);
        });
    }
}

// Update today's goal
function updateTodayGoal() {
    const todayGoal = document.getElementById('today-goal');
    if (userSchedule && userSchedule.subjects) {
        const totalHours = userSchedule.subjects.reduce((sum, subject) => {
            return sum + (subject.daily_hours || 2);
        }, 0);
        todayGoal.textContent = `${totalHours.toFixed(1)} hours`;
    } else {
        todayGoal.textContent = '4.0 hours';
    }
}

// Load progress history
async function loadProgressHistory() {
    try {
        const progressRef = db.collection('progress').where('user_email', '==', currentUser.email);
        const snapshot = await progressRef.orderBy('timestamp', 'desc').limit(10).get();
        
        progressData = [];
        snapshot.forEach(doc => {
            progressData.push({ id: doc.id, ...doc.data() });
        });
        
        displayProgressHistory();
        updateProgressStats();
        createCharts();
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

// Display progress history
function displayProgressHistory() {
    const historyContainer = document.getElementById('progress-history');
    historyContainer.innerHTML = '';
    
    if (progressData.length === 0) {
        historyContainer.innerHTML = '<p style="text-align: center; color: #6c757d;">No progress entries yet. Start logging your study sessions!</p>';
        return;
    }
    
    progressData.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'progress-entry';
        
        const date = new Date(entry.timestamp.toDate()).toLocaleDateString();
        const time = new Date(entry.timestamp.toDate()).toLocaleTimeString();
        
        entryDiv.innerHTML = `
            <div class="entry-header">
                <span class="entry-subject">${entry.subject}</span>
                <span class="entry-date">${date} at ${time}</span>
            </div>
            <div class="entry-details">
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${entry.hours} hours</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-star"></i>
                    <span>Difficulty: ${entry.difficulty}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-thumbs-up"></i>
                    <span>Confidence: ${entry.confidence}/10</span>
                </div>
            </div>
            <div class="entry-topics">
                <h4>Topics Covered:</h4>
                <p>${entry.topics}</p>
            </div>
            ${entry.notes ? `<div class="entry-topics"><h4>Notes:</h4><p>${entry.notes}</p></div>` : ''}
        `;
        
        historyContainer.appendChild(entryDiv);
    });
}

// Update progress statistics
function updateProgressStats() {
    const totalStudyTime = progressData.reduce((sum, entry) => sum + entry.hours, 0);
    const completionRate = calculateCompletionRate();
    const studyStreak = calculateStudyStreak();
    
    document.getElementById('total-study-time').textContent = `${totalStudyTime.toFixed(1)} hours`;
    document.getElementById('completion-rate').textContent = `${completionRate}%`;
    document.getElementById('study-streak').textContent = `${studyStreak} days`;
}

// Calculate completion rate
function calculateCompletionRate() {
    if (!userSchedule || !userSchedule.subjects) return 0;
    
    const totalRecommended = userSchedule.subjects.reduce((sum, subject) => {
        return sum + (subject.recommended_hours || 0);
    }, 0);
    
    const totalCompleted = progressData.reduce((sum, entry) => sum + entry.hours, 0);
    
    return totalRecommended > 0 ? Math.min(100, Math.round((totalCompleted / totalRecommended) * 100)) : 0;
}

// Calculate study streak
function calculateStudyStreak() {
    if (progressData.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = new Date(today);
    
    while (true) {
        const hasEntry = progressData.some(entry => {
            const entryDate = new Date(entry.timestamp.toDate());
            entryDate.setHours(0, 0, 0, 0);
            return entryDate.getTime() === currentDate.getTime();
        });
        
        if (hasEntry) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    return streak;
}

// Create charts
function createCharts() {
    createWeeklyChart();
    createSubjectChart();
}

// Create weekly study hours chart
function createWeeklyChart() {
    const ctx = document.getElementById('weekly-chart').getContext('2d');
    
    const last7Days = [];
    const studyHours = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        
        const dayHours = progressData.filter(entry => {
            const entryDate = new Date(entry.timestamp.toDate());
            entryDate.setHours(0, 0, 0, 0);
            return entryDate.getTime() === date.getTime();
        }).reduce((sum, entry) => sum + entry.hours, 0);
        
        studyHours.push(dayHours);
    }
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Study Hours',
                data: studyHours,
                backgroundColor: '#5b95cf',
                borderColor: '#4a7caf',
                borderWidth: 1
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
            }
        }
    });
}

// Create subject performance chart
function createSubjectChart() {
    const ctx = document.getElementById('subject-chart').getContext('2d');
    
    const subjectStats = {};
    
    progressData.forEach(entry => {
        if (!subjectStats[entry.subject]) {
            subjectStats[entry.subject] = { hours: 0, count: 0 };
        }
        subjectStats[entry.subject].hours += entry.hours;
        subjectStats[entry.subject].count += 1;
    });
    
    const subjects = Object.keys(subjectStats);
    const hours = subjects.map(subject => subjectStats[subject].hours);
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: subjects,
            datasets: [{
                data: hours,
                backgroundColor: [
                    '#5b95cf',
                    '#28a745',
                    '#ffc107',
                    '#dc3545',
                    '#6f42c1'
                ]
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

// Handle form submission
document.getElementById('progress-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    try {
        const formData = {
            subject: document.getElementById('subject-select').value,
            hours: parseFloat(document.getElementById('study-hours').value),
            topics: document.getElementById('study-topics').value,
            difficulty: document.querySelector('input[name="difficulty"]:checked').value,
            confidence: parseInt(document.getElementById('confidence-level').value),
            notes: document.getElementById('notes').value,
            user_email: currentUser.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Validate data
        if (!validateProgressData(formData)) {
            throw new Error('Please fill in all required fields correctly.');
        }
        
        // Save to Firebase
        await db.collection('progress').add(formData);
        
        // Show success message
        showMessage('Progress logged successfully!', 'success');
        
        // Reset form
        event.target.reset();
        document.getElementById('confidence-value').textContent = '5';
        
        // Reload data
        await loadProgressHistory();
        
    } catch (error) {
        console.error('Error saving progress:', error);
        showMessage(error.message, 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

// Validate progress data
function validateProgressData(data) {
    if (!data.subject || data.hours <= 0 || !data.topics.trim()) {
        return false;
    }
    
    if (data.hours > 12) {
        showMessage('Study hours cannot exceed 12 hours per session.', 'error');
        return false;
    }
    
    return true;
}

// Show message
function showMessage(message, type = 'error') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(messageDiv, container.firstChild);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
} 