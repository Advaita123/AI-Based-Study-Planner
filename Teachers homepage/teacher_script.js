// Update current date
function updateDate() {
    const date = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = date.toLocaleDateString('en-US', options);
}

// Sample student data (in a real application, this would come from a database)
const studentDatabase = {
    'STU001': {
        name: 'Student name: Advaita',
        progress: {
            mathematics: 80,
            physics: 65,
            chemistry: 90,
            biology: 75
        },
        tasks: {
            completed: 15,
            left: 5,
            studyHours: 45
        },
        remarks: ''
    },
    'STU002': {
        name: 'John Doe',
        progress: {
            mathematics: 70,
            physics: 85,
            chemistry: 60,
            biology: 80
        },
        tasks: {
            completed: 12,
            left: 8,
            studyHours: 40
        },
        remarks: ''
    }
};

// Initialize progress chart
function initializeProgressChart(subjectData) {
    const ctx = document.getElementById('progress-chart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(subjectData),
            datasets: [{
                data: Object.values(subjectData),
                backgroundColor: [
                    'rgba(76, 154, 255, 0.8)',
                    'rgba(163, 190, 140, 0.8)',
                    'rgba(236, 239, 244, 0.8)',
                    'rgba(94, 129, 172, 0.8)'
                ],
                borderColor: [
                    'rgba(76, 154, 255, 1)',
                    'rgba(163, 190, 140, 1)',
                    'rgba(236, 239, 244, 1)',
                    'rgba(94, 129, 172, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#2E3440'
                    }
                },
                title: {
                    display: true,
                    text: 'Subject-wise Progress',
                    color: '#2E3440',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// Display student performance
function displayStudentPerformance(studentId) {
    const student = studentDatabase[studentId];
    if (!student) {
        alert('Student not found!');
        return;
    }

    // Show performance section
    document.getElementById('performance-section').style.display = 'block';
    
    // Update student name
    document.getElementById('student-name-display').textContent = student.name;
    
    // Update task statistics
    document.getElementById('tasks-completed').textContent = student.tasks.completed;
    document.getElementById('tasks-left').textContent = student.tasks.left;
    document.getElementById('study-hours').textContent = student.tasks.studyHours;
    
    // Update remarks if any
    document.getElementById('teacher-remarks').value = student.remarks;
    
    // Initialize progress chart
    initializeProgressChart(student.progress);
}

// Handle student search
function handleStudentSearch() {
    const studentId = document.getElementById('student-id').value.trim().toUpperCase();
    if (studentId) {
        displayStudentPerformance(studentId);
    } else {
        alert('Please enter a student ID');
    }
}

// Handle remarks saving
function handleSaveRemarks() {
    const studentId = document.getElementById('student-id').value.trim().toUpperCase();
    const remarks = document.getElementById('teacher-remarks').value;
    
    if (studentId && studentDatabase[studentId]) {
        studentDatabase[studentId].remarks = remarks;
        alert('Remarks saved successfully!');
    } else {
        alert('Please search for a student first!');
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    updateDate();
    
    // Set teacher name (in a real application, this would come from login)
    document.getElementById('teacher-name').textContent = 'Professor ';
    
    // Add event listeners
    document.getElementById('search-student').addEventListener('click', handleStudentSearch);
    document.getElementById('student-id').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleStudentSearch();
        }
    });
    document.getElementById('save-remarks').addEventListener('click', handleSaveRemarks);
}); 