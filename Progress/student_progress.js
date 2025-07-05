let currentUser = null;
let userSchedule = null;
let progressData = [];

document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    
    // Add form submission handler
    const progressForm = document.getElementById('progress-form');
    if (progressForm) {
        progressForm.addEventListener('submit', handleProgressSubmission);
    }
});

function checkAuth() {
    auth.onAuthStateChanged(async user => {
        if (user) {
            currentUser = user;
            console.log('Logged in as:', user.email);
            await loadUserSchedule();
            await loadAllLogsAndUpdateUI();
            await fetchTeacherRemarks(); // Fetch teacher remarks after authentication
        } else {
            window.location.href = '../Login/login.html';
        }
    });
}

async function loadUserSchedule() {
    try {
        const response = await fetch('http://localhost:5000/api/user_schedule', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_email: currentUser.email })
        });
        const data = await response.json();
        userSchedule = data.schedule || {};
        if (!userSchedule.subjects || userSchedule.subjects.length === 0) {
            console.log('No subjects in user schedule');
            userSchedule.subjects = defaultSubjects();
        }
    } catch (err) {
        console.error('Error fetching user schedule:', err);
        userSchedule = { subjects: defaultSubjects() };
    }
    populateSubjectSelect();
}

function defaultSubjects() {
    return [
        { name: 'Mathematics', difficulty: 'Medium' },
        { name: 'Physics', difficulty: 'Hard' },
        { name: 'Chemistry', difficulty: 'Easy' },
        { name: 'Biology', difficulty: 'Medium' }
    ];
}

function populateSubjectSelect() {
    const container = document.getElementById('subject-progress-list');
    container.innerHTML = '';
    userSchedule.subjects.forEach(subj => {
        const row = document.createElement('div');
        row.className = 'subject-progress-row';
        row.innerHTML = `
            <input type="checkbox" name="subjects" value="${subj.name}">
            <label>${subj.name}</label>
            <input type="text" class="subject-topics" placeholder="Topics">
            <input type="range" class="subject-confidence" min="1" max="10" value="5">
            <span class="conf-value">5</span>
        `;
        // Update confidence value display
        const slider = row.querySelector('.subject-confidence');
        const confValue = row.querySelector('.conf-value');
        slider.addEventListener('input', () => { confValue.textContent = slider.value; });
        container.appendChild(row);
    });
}

async function loadAllLogsAndUpdateUI() {
    try {
        console.log('Loading logs for user:', currentUser.email);
        
        const snap = await db.collection('progress')
            .where('user_email', '==', currentUser.email)
            .orderBy('timestamp', 'desc').get();
        
        console.log('Found documents:', snap.size);
        
        const allLogs = [];
        snap.forEach(doc => {
            const data = doc.data();
            // Convert Firestore timestamp to regular date if needed
            if (data.timestamp && data.timestamp.toDate) {
                data.timestamp = data.timestamp.toDate();
            }
            allLogs.push({ id: doc.id, ...data });
        });
        
        console.log('Processed logs:', allLogs.length);
        console.log('Logs data:', allLogs);
        
        // Show recent log for all subjects
        showRecentLogForAllSubjects(allLogs);
        // Update subject performance chart
        updateSubjectChartWithAllLogs(allLogs);
        // Update progress history
        updateProgressHistory(allLogs);
    } catch (err) {
        console.error('Error loading logs:', err);
        document.getElementById('recent-log').innerHTML = '<p style="color:red;">Error loading recent log.</p>';
        updateSubjectChartWithAllLogs([]);
        updateProgressHistory([]);
    }
}

function showRecentLogForAllSubjects(allLogs) {
    console.log('Showing recent logs for subjects. All logs:', allLogs);
    console.log('User schedule subjects:', userSchedule?.subjects);
    
    const container = document.getElementById('recent-log');
    container.innerHTML = '';
    if (!userSchedule || !userSchedule.subjects) {
        console.log('No user schedule or subjects found');
        return;
    }
    
    userSchedule.subjects.forEach(subj => {
        console.log('Processing subject:', subj.name);
        // Find the most recent log for this subject
        const log = allLogs.find(l => l.subject === subj.name);
        console.log('Found log for subject:', subj.name, log);
        
        if (log) {
            const date = log.timestamp && log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
            container.innerHTML += `
                <div class="recent-log-entry" style="border:1px solid #eee; border-radius:6px; padding:0.5em 1em; margin-bottom:0.5em;">
                    <strong>${log.subject}</strong> <span style="color:#888; font-size:0.9em;">(${date.toLocaleDateString()} ${date.toLocaleTimeString()})</span><br>
                    <span><b>Topics:</b> ${log.topics}</span><br>
                    <span><b>Confidence:</b> ${log.confidence}/10</span><br>
                    <span><b>Hours:</b> ${log.hours}</span>
                </div>
            `;
        } else {
            container.innerHTML += `
                <div class="recent-log-entry" style="border:1px solid #eee; border-radius:6px; padding:0.5em 1em; margin-bottom:0.5em;">
                    <strong>${subj.name}</strong> <span style="color:#888; font-size:0.9em;">No recent log</span>
                </div>
            `;
        }
    });
}

function updateSubjectChartWithAllLogs(allLogs) {
    const ctx = document.getElementById('subject-chart').getContext('2d');
    const allSubjects = userSchedule && userSchedule.subjects ? userSchedule.subjects.map(s => s.name) : [];
    const subjectMap = {};
    allSubjects.forEach(name => subjectMap[name] = 0);
    allLogs.forEach(e => {
        if (subjectMap.hasOwnProperty(e.subject)) subjectMap[e.subject] += e.hours || 0;
    });
    const subjectNames = Object.keys(subjectMap);
    const studyHours = Object.values(subjectMap);
    if (window.subjectChartInstance) window.subjectChartInstance.destroy();
    window.subjectChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: subjectNames,
            datasets: [{
                data: studyHours,
                backgroundColor: [
                    '#5b95cf', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#17a2b8', '#fd7e14', '#6610f2', '#20c997'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

async function sendRecentProgressToTeacher() {
    try {
        const snap = await db.collection('progress')
            .where('user_email', '==', currentUser.email)
            .orderBy('timestamp', 'desc').limit(1).get();
        const recent = [];
        snap.forEach(doc => {
            const data = doc.data();
            // Convert Firestore timestamp to regular date if needed
            if (data.timestamp && data.timestamp.toDate) {
                data.timestamp = data.timestamp.toDate();
            }
            recent.push({ id: doc.id, ...data });
        });
        if (recent.length > 0) {
            await fetch('http://localhost:5000/api/save_recent_progress_for_teacher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_email: currentUser.email, recent_progress: recent[0] })
            });
        }
    } catch (err) { 
        console.error('Error sending recent progress to teacher:', err);
    }
}

async function fetchTeacherRemarks() {
    try {
        console.log('Fetching teacher remarks for user:', currentUser.email);
        
        const res = await fetch('http://localhost:5000/api/get_teacher_remarks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_email: currentUser.email })
        });
        
        console.log('Teacher remarks response status:', res.status);
        const data = await res.json();
        console.log('Teacher remarks response data:', data);
        
        const remarksElement = document.getElementById('teacher-remarks-display');
        if (remarksElement) {
            const remarksText = data.remarks && data.remarks.trim() ? data.remarks : 'No remarks yet.';
            remarksElement.textContent = remarksText;
            console.log('Updated teacher remarks display with:', remarksText);
        } else {
            console.error('Teacher remarks display element not found');
        }
    } catch (err) {
        console.error('Error fetching teacher remarks:', err);
        const remarksElement = document.getElementById('teacher-remarks-display');
        if (remarksElement) {
            remarksElement.textContent = 'No remarks yet.';
        }
    }
}

async function handleProgressSubmission(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Please log in to save progress');
        return;
    }
    
    try {
        console.log('Starting progress submission...');
        
        // Get selected subjects
        const selectedSubjects = [];
        const subjectRows = document.querySelectorAll('.subject-progress-row');
        console.log('Found subject rows:', subjectRows.length);
        
        subjectRows.forEach(row => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            const topicsInput = row.querySelector('.subject-topics');
            const confidenceSlider = row.querySelector('.subject-confidence');
            
            if (checkbox && checkbox.checked) {
                selectedSubjects.push({
                    name: checkbox.value,
                    topics: topicsInput ? topicsInput.value.trim() : '',
                    confidence: confidenceSlider ? parseInt(confidenceSlider.value) : 5
                });
            }
        });
        
        console.log('Selected subjects:', selectedSubjects);
        
        if (selectedSubjects.length === 0) {
            alert('Please select at least one subject');
            return;
        }
        
        // Get other form data
        const studyHours = parseFloat(document.getElementById('study-hours').value);
        const difficulty = document.querySelector('input[name="difficulty"]:checked')?.value;
        const notes = document.getElementById('notes').value.trim();
        
        console.log('Form data:', { studyHours, difficulty, notes });
        
        if (!studyHours || !difficulty) {
            alert('Please fill in all required fields');
            return;
        }
        
        // Calculate hours per subject
        const hoursPerSubject = Math.round(studyHours / selectedSubjects.length,2);
        
        // Save progress for each selected subject
        for (const subject of selectedSubjects) {
            const progressData = {
                user_email: currentUser.email,
                subject: subject.name,
                topics: subject.topics || 'General study',
                hours: hoursPerSubject,
                confidence: subject.confidence,
                difficulty: difficulty,
                notes: notes,
                timestamp: new Date()
            };
            
            console.log('Saving progress data:', progressData);
            
            // Save to Firebase
            const docRef = await db.collection('progress').add(progressData);
            console.log('Progress saved with ID:', docRef.id);
        }
        
        // Reset form
        e.target.reset();
        document.querySelectorAll('.subject-progress-row input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('.subject-topics').forEach(input => input.value = '');
        document.querySelectorAll('.subject-confidence').forEach(slider => {
            slider.value = 5;
            slider.nextElementSibling.textContent = '5';
        });
        
        // Reload logs and update UI
        console.log('Reloading logs and updating UI...');
        await loadAllLogsAndUpdateUI();
        await sendRecentProgressToTeacher();
        
        alert('Progress logged successfully!');
        
    } catch (error) {
        console.error('Error saving progress:', error);
        alert('Error saving progress. Please try again.');
    }
}

function updateProgressHistory(allLogs) {
    const container = document.getElementById('progress-history');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (allLogs.length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center;">No progress logs yet. Start studying to see your history!</p>';
        return;
    }
    
    // Show last 10 logs
    const recentLogs = allLogs.slice(0, 10);
    
    recentLogs.forEach(log => {
        const date = log.timestamp && log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const logEntry = document.createElement('div');
        logEntry.className = 'history-entry';
        logEntry.style.cssText = `
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        
        logEntry.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="color: #2c3e50; font-size: 1.1em;">${log.subject}</strong>
                <span style="color: #7f8c8d; font-size: 0.9em;">${formattedDate}</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 8px;">
                <div><strong>Hours:</strong> ${log.hours}</div>
                <div><strong>Confidence:</strong> ${log.confidence}/10</div>
                <div><strong>Difficulty:</strong> ${log.difficulty}</div>
            </div>
            ${log.topics ? `<div style="margin-bottom: 8px;"><strong>Topics:</strong> ${log.topics}</div>` : ''}
            ${log.notes ? `<div style="color: #666; font-style: italic;"><strong>Notes:</strong> ${log.notes}</div>` : ''}
        `;
        
        container.appendChild(logEntry);
    });
}
