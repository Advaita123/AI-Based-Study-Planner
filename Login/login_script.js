// Sample user database (Simulating a backend)
const users = {
    'student1': {
        password: 'student123',
        role: 'student'
    },
    'teacher1': {
        password: 'teacher123',
        role: 'teacher'
    }
};

// Handle role selection
document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        console.log("Role selected:", this.dataset.role); // Debugging: Log selected role
    });
});

// Handle form submission
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault(); // Prevent page refresh

    // Debugging: Log to confirm form submission is intercepted
    console.log("Form submission intercepted.");

    // Get user input
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    // Ensure role is selected
    const activeRoleButton = document.querySelector('.role-btn.active');
    if (!activeRoleButton) {
        alert("Please select a role (Student or Teacher)");
        console.log("No role selected. Stopping execution.");
        return; // Stop further execution
    }
    const activeRole = activeRoleButton.dataset.role;

    // Debugging: Check inputs
    console.log("Attempting login with:", { username, password, role: activeRole });

    // Validate credentials
    if (users.hasOwnProperty(username) && users[username].password === password && users[username].role === activeRole) {
        console.log("Login successful!");

        // Store session info
        localStorage.setItem('userRole', activeRole);
        localStorage.setItem('username', username);

        // Prevent form from being cleared
        e.preventDefault();
        
        // Redirect user
        setTimeout(() => {
            window.location.href = activeRole === 'student' ? '../Home page/student_home.html' : '../Home page/teacher_home.html';
        }, 100);
    } else {
        alert('Invalid username, password, or role selection.');
        console.log("Invalid credentials. Stopping execution.");
        return; // Stop further execution to prevent clearing fields
    }
});

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', function() {
    const userRole = localStorage.getItem('userRole');
    if (userRole) {
        window.location.href = userRole === 'student' ? '../Home page/student_home.html' : '../Home page/teacher_home.html';
    }
});

// Handle forgot password
document.querySelector('.forgot-password').addEventListener('click', function(e) {
    e.preventDefault();
    alert('Password reset functionality will be implemented soon!');
});

// Handle create account
document.querySelector('.create-account').addEventListener('click', function(e) {
    e.preventDefault();
    alert('Account creation functionality will be implemented soon!');
});
