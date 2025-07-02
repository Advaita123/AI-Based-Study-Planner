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

// Global variables
let currentUser = null;
let userSchedule = null;

// Update current date
function updateDate() {
    const date = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = date.toLocaleDateString('en-US', options);
}

// Calculate days left until exam
function updateExamCountdown() {
    if (userSchedule && userSchedule.exam_date) {
        const examStartDate = new Date(userSchedule.exam_date);
        const today = new Date();
        const diffTime = examStartDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            document.getElementById('days-left').textContent = 'Completed';
            document.getElementById('days-left').style.color = '#A3BE8C'; // Green color for completed
        } else {
            document.getElementById('days-left').textContent = diffDays;
            document.getElementById('days-left').style.color = '#4C9AFF'; // Blue color for upcoming
        }
        
        // Update exam name and dates
        document.getElementById('exam-name').textContent = 'Final Exams';
        document.getElementById('exam-start').innerHTML = `Start: <span>${userSchedule.exam_date}</span>`;
        document.getElementById('exam-end').innerHTML = `End: <span>${userSchedule.exam_date}</span>`;
    } else {
        // Default values if no schedule
        document.getElementById('days-left').textContent = '0';
        document.getElementById('exam-name').textContent = 'No Schedule Set';
        document.getElementById('exam-start').innerHTML = 'Start: <span>Create a schedule first</span>';
        document.getElementById('exam-end').innerHTML = 'End: <span>Create a schedule first</span>';
    }
}

// Load user schedule from backend
async function loadUserSchedule() {
    try {
        if (!currentUser) {
            console.log("No user logged in");
            return;
        }

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
            console.log("User schedule loaded:", userSchedule);
            
            // Update dashboard with real schedule data
            updateDashboardWithSchedule();
        } else {
            console.log("No schedule found for user");
            userSchedule = null;
        }
    } catch (error) {
        console.error('Error loading user schedule:', error);
        userSchedule = null;
    }
}

// Update dashboard with schedule data
function updateDashboardWithSchedule() {
    if (!userSchedule || !userSchedule.subjects || userSchedule.subjects.length === 0) {
        showEmptyScheduleState();
        return;
    }

    
    updateExamCountdown();

    const totalSubjects = userSchedule.subjects.length;
    const totalHours = userSchedule.subjects.reduce((sum, subject) => sum + subject.recommended_hours, 0);
    const avgProgress = userSchedule.subjects.reduce((sum, subject) => sum + (subject.marks || 0), 0) / totalSubjects;
    
    document.getElementById('pending-tasks').textContent = totalSubjects;
    document.getElementById('notification-count').textContent = Math.ceil(totalHours / 10);
    document.getElementById('overall-progress').textContent = `${Math.round(avgProgress)}%`;
    
    populateSchedule();
    populateDifficultyLevels();
}

// Show empty schedule state
function showEmptyScheduleState() {
    const scheduleList = document.getElementById('schedule-list');
    scheduleList.innerHTML = `
        <div class="empty-schedule">
            <i class="fas fa-calendar-plus"></i>
            <p>No schedule created yet</p>
            <a href="../Create/new.html" class="create-schedule-btn">
                <i class="fas fa-plus"></i> Create Schedule
            </a>
        </div>
    `;
    
    const difficultyList = document.getElementById('difficulty-list');
    difficultyList.innerHTML = `
        <div class="empty-subjects">
            <i class="fas fa-book-open"></i>
            <p>Add subjects to see difficulty levels</p>
        </div>
    `;
    
    // Update stats
    document.getElementById('pending-tasks').textContent = '0';
    document.getElementById('notification-count').textContent = '0';
    document.getElementById('overall-progress').textContent = '0%';
}

// Populate schedule with real data
function populateSchedule() {
    const scheduleList = document.getElementById('schedule-list');
    scheduleList.innerHTML = '';
    
    if (userSchedule && userSchedule.subjects) {
        userSchedule.subjects.forEach((subject, index) => {
            const scheduleItem = document.createElement('div');
            scheduleItem.className = 'schedule-item';
            
            // Calculate time based on subject order
            const startHour = 9 + (index * 2); // Start at 9 AM, 2-hour intervals
            const time = `${startHour}:00 ${startHour >= 12 ? 'PM' : 'AM'}`;
            
            scheduleItem.innerHTML = `
                <div>
                    <strong>${time}</strong>
                    <p>${subject.name}</p>
                </div>
                <span>${subject.daily_hours} hours</span>
            `;
            scheduleList.appendChild(scheduleItem);
        });
    }
}

// Populate difficulty levels with real data
function populateDifficultyLevels() {
    const difficultyList = document.getElementById('difficulty-list');
    difficultyList.innerHTML = '';
    
    if (userSchedule && userSchedule.subjects) {
        userSchedule.subjects.forEach(subject => {
            const difficultyItem = document.createElement('div');
            difficultyItem.className = 'difficulty-item';
            
            const difficultyColor = {
                'Easy': '#28a745',
                'Medium': '#ffc107',
                'Hard': '#dc3545'
            };
            
            difficultyItem.innerHTML = `
                <div>
                    <strong>${subject.name}</strong>
                    <p style="color: ${difficultyColor[subject.difficulty]}">${subject.difficulty}</p>
                </div>
                <span>${subject.marks || 0}%</span>
            `;
            difficultyList.appendChild(difficultyItem);
        });
    }
}

// Initialize the dashboard
function initializeDashboard() {
    // Set student name from Firebase user
    if (currentUser) {
        const displayName = currentUser.displayName || currentUser.email.split('@')[0];
        document.getElementById('student-name').textContent = displayName;
    } else {
        document.getElementById('student-name').textContent = "Student";
    }
    
    // Load user schedule and update dashboard
    loadUserSchedule();
}

// Chatbot functionality
function initializeChatbot() {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');
    
    function addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isUser ? 'user-message' : 'bot-message'}`;
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message bot-message typing';
        typingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI is thinking...';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return typingDiv;
    }
    
    async function handleUserMessage() {
        const message = chatInput.value.trim();
        if (message) {
            addMessage(message, true);
            chatInput.value = '';
            
            // Show typing indicator
            const typingIndicator = addTypingIndicator();
            
            try {
                // Send message to Gemini AI backend
                const response = await fetch('http://localhost:5000/api/chatbot', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message: message })
                });
                
                const data = await response.json();
                
                // Remove typing indicator
                typingIndicator.remove();
                
                if (data.status === 'success') {
                    addMessage(data.response);
                } else {
                    addMessage("I'm sorry, I couldn't process your request. Please try again.");
                }
                
            } catch (error) {
                console.error('Chatbot error:', error);
                typingIndicator.remove();
                addMessage("I'm having trouble connecting right now. Please check your internet connection and try again.");
            }
        }
    }
    
    sendButton.addEventListener('click', handleUserMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUserMessage();
        }
    });
    
    // Add welcome message
    addMessage("Hello! I'm your AI study assistant powered by Gemini. I can help you with:\n• Explaining academic concepts\n• Study strategies and tips\n• Time management advice\n• Motivational support\n\nHow can I help you today?");
}

// Check authentication and initialize
function checkAuthAndInitialize() {
    auth.onAuthStateChanged(function(user) {
        if (user) {
            currentUser = user;
            console.log('User authenticated:', user.email);
            
            // Initialize dashboard after authentication
            updateDate();
            updateExamCountdown();
            initializeDashboard();
            initializeChatbot();
        } else {
            // Redirect to login if not authenticated
            window.location.href = '../Login/login.html';
        }
    });
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndInitialize();
}); 