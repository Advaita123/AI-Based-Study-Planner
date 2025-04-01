// Update current date
function updateDate() {
    const date = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = date.toLocaleDateString('en-US', options);
}

// Calculate days left until exam
function updateExamCountdown() {
    const examStartDate = new Date('2024-05-15');
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
}

// Sample data for demonstration
const sampleData = {
    studentName: "Advaita",
    pendingTasks: 5,
    notifications: 3,
    overallProgress: 75,
    schedule: [
        { time: "09:00 AM", subject: "Mathematics", duration: "1 hour" },
        { time: "10:30 AM", subject: "Physics", duration: "1.5 hours" },
        { time: "02:00 PM", subject: "Chemistry", duration: "1 hour" }
    ],
    subjects: [
        { name: "Mathematics", difficulty: "Hard", progress: 80 },
        { name: "Physics", difficulty: "Medium", progress: 65 },
        { name: "Chemistry", difficulty: "Easy", progress: 90 },
        { name: "Biology", difficulty: "Medium", progress: 75 }
    ]
};

// Initialize the dashboard
function initializeDashboard() {
    // Set student name
    document.getElementById('student-name').textContent = sampleData.studentName;
    
    // Update stats
    document.getElementById('pending-tasks').textContent = sampleData.pendingTasks;
    document.getElementById('notification-count').textContent = sampleData.notifications;
    document.getElementById('overall-progress').textContent = `${sampleData.overallProgress}%`;
    
    // Populate schedule
    const scheduleList = document.getElementById('schedule-list');
    sampleData.schedule.forEach(item => {
        const scheduleItem = document.createElement('div');
        scheduleItem.className = 'schedule-item';
        scheduleItem.innerHTML = `
            <div>
                <strong>${item.time}</strong>
                <p>${item.subject}</p>
            </div>
            <span>${item.duration}</span>
        `;
        scheduleList.appendChild(scheduleItem);
    });
    
    // Populate difficulty levels
    const difficultyList = document.getElementById('difficulty-list');
    sampleData.subjects.forEach(subject => {
        const difficultyItem = document.createElement('div');
        difficultyItem.className = 'difficulty-item';
        difficultyItem.innerHTML = `
            <div>
                <strong>${subject.name}</strong>
                <p>${subject.difficulty}</p>
            </div>
            <span>${subject.progress}%</span>
        `;
        difficultyList.appendChild(difficultyItem);
    });
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
    
    function handleUserMessage() {
        const message = chatInput.value.trim();
        if (message) {
            addMessage(message, true);
            chatInput.value = '';
            
            // Simulate bot response
            setTimeout(() => {
                const responses = [
                    "I can help you with that! What specific topic would you like to discuss?",
                    "That's an interesting question. Let me help you understand it better.",
                    "I can provide you with study materials and practice questions for that topic.",
                    "Would you like me to explain the concept step by step?"
                ];
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                addMessage(randomResponse);
            }, 1000);
        }
    }
    
    sendButton.addEventListener('click', handleUserMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUserMessage();
        }
    });
    
    // Add welcome message
    addMessage("Hello! I'm your AI study assistant. How can I help you today?");
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', () => {
    updateDate();
    updateExamCountdown();
    initializeDashboard();
    initializeChatbot();
}); 