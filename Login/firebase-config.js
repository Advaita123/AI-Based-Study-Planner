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

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables
let selectedRole = "student";

// Handle role selection
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll(".role-btn").forEach(button => {
        button.addEventListener("click", function () {
            document.querySelectorAll(".role-btn").forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");
            selectedRole = this.getAttribute("data-role");
        });
    });
});

// Show message function
function showMessage(message, type = 'error') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    // Hide message after 5 seconds
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Check if user is already logged in
auth.onAuthStateChanged(function(user) {
    if (user) {
        // User is signed in, check their role
        checkUserRole(user.uid);
    }
});

// Check user role in Firestore
async function checkUserRole(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            const role = userData.role;
            
            // Redirect based on role
            if (role === 'student') {
                window.location.href = '../Homepage/student_home.html';
            } else if (role === 'teacher') {
                window.location.href = '../Teachers homepage/teacher_home.html';
            }
        }
    } catch (error) {
        console.error("Error checking user role:", error);
    }
} 