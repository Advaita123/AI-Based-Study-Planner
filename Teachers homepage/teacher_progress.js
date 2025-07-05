// Firebase configuration for teacher progress tracking
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



// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    updateDate();
    initializeSearch();
    checkAuth();
    initializeSaveRemarks();
});

// Check authentication
function checkAuth() {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = '../Login/login.html';
        }
    });
}

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
    window.currentStudentEmail = studentEmail;
    const searchBtn = document.getElementById('search-student');
    const originalText = searchBtn.innerHTML;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    searchBtn.disabled = true;
    
    try {
        // Get teacher remarks from backend
        const remarksResponse = await fetch('http://localhost:5000/api/get_teacher_remarks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                student_email: studentEmail
            })
        });
        
        let teacherRemarks = '';
        if (remarksResponse.ok) {
            const remarksData = await remarksResponse.json();
            teacherRemarks = remarksData.remarks || '';
        }
        
        // Get progress data from Firebase
        const progressData = await getStudentProgressFromFirebase(studentEmail);
        progressData.teacher_remarks = teacherRemarks;
        
        displayStudentProgress(progressData);
        showMessage(`Progress loaded for ${progressData.student_name}`, 'success');
        
    } catch (error) {
        console.error('Error searching student:', error);
        showNoResults();
        showMessage('Error connecting to server. Please try again.', 'error');
    } finally {
        searchBtn.innerHTML = originalText;
        searchBtn.disabled = false;
    }
}

// Get student progress from Firebase
async function getStudentProgressFromFirebase(studentEmail) {
    try {
        console.log('Fetching progress for student:', studentEmail);
        
        const snap = await db.collection('progress')
            .where('user_email', '==', studentEmail)
            .orderBy('timestamp', 'desc')
            .limit(10) 
            .get();
        
        console.log('Found documents:', snap.size);
        
        const recentEntries = [];
        snap.forEach(doc => {
            const data = doc.data();
            // Convert Firestore timestamp to regular date if needed
            if (data.timestamp && data.timestamp.toDate) {
                data.timestamp = data.timestamp.toDate();
            }
            recentEntries.push({
                id: doc.id,
                subject: data.subject,
                topics: data.topics,
                hours: data.hours,
                confidence: data.confidence,
                difficulty: data.difficulty,
                notes: data.notes,
                date: data.timestamp
            });
        });
        
        console.log('Processed entries:', recentEntries);
        
        return {
            student_email: studentEmail,
            student_name: studentEmail.split('@')[0],
            recent_entries: recentEntries
        };
        
    } catch (error) {
        console.error('Error fetching from Firebase:', error);
        return {
            student_email: studentEmail,
            student_name: studentEmail.split('@')[0],
            recent_entries: []
        };
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
    
    // Display recent entries
    displayRecentEntries(data.recent_entries);
    
    // Load existing teacher remarks
    document.getElementById('teacher-remarks').value = data.teacher_remarks || '';
    
    // Initialize save remarks button after progress section is shown
    initializeSaveRemarks();
    
    
}

// Display recent entries
function displayRecentEntries(entries) {
    const recentEntries = document.getElementById('recent-entries');
    recentEntries.innerHTML = '';
    
    if (entries.length === 0) {
        recentEntries.innerHTML = `
            <div class="no-entries">
                <i class="fas fa-info-circle"></i>
                <p>No recent study sessions found for this student.</p>
                <p>The student may not have logged any progress yet.</p>
            </div>
        `;
        return;
    }
    
    entries.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'entry-card';
        
        const date = new Date(entry.date);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
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
                    <i class="fas fa-star"></i>
                    <span>Difficulty: ${entry.difficulty || 'Not specified'}</span>
                </div>
            </div>
            <div class="entry-topics">
                <strong>Topics:</strong> ${entry.topics || 'General study'}
            </div>
            ${entry.notes ? `<div class="entry-notes"><strong>Notes:</strong> ${entry.notes}</div>` : ''}
        `;
        
        recentEntries.appendChild(entryDiv);
    });
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
function initializeSaveRemarks() {
    const saveButton = document.getElementById('save-remarks');
    if (saveButton) {
        // Remove existing event listener if any
        saveButton.removeEventListener('click', handleSaveRemarks);
        // Add new event listener
        saveButton.addEventListener('click', handleSaveRemarks);
        console.log('Save remarks button event listener initialized');
    } else {
        console.error('Save remarks button not found');
    }
}

async function handleSaveRemarks() {
    console.log('Save remarks button clicked');
    const remarks = document.getElementById('teacher-remarks').value.trim();
    console.log('Remarks text:', remarks);
    console.log('Current student email:', window.currentStudentEmail);
    
    if (remarks && window.currentStudentEmail) {
        try {
            console.log('Sending remarks to backend...');
            const response = await fetch('http://localhost:5000/api/save_teacher_remarks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    student_email: window.currentStudentEmail, 
                    remarks: remarks 
                })
            });
            
            console.log('Response status:', response.status);
            const responseData = await response.json();
            console.log('Response data:', responseData);
            
            if (response.ok) {
                showMessage('Remarks saved successfully!', 'success');
            } else {
                showMessage('Failed to save remarks: ' + (responseData.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error saving remarks:', error);
            showMessage('Error saving remarks: ' + error.message, 'error');
        }
    } else {
        if (!remarks) {
            showMessage('Please enter some remarks before saving.', 'error');
        } else if (!window.currentStudentEmail) {
            showMessage('No student selected. Please search for a student first.', 'error');
        }
    }
} 