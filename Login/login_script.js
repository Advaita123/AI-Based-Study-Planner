// Sample user database (Simulating a backend)
const users = {
    'student1': { password: 'student123', role: 'student' },
    'teacher1': { password: 'teacher123', role: 'teacher' }
};

// Set default role
//let selectedRole = "student"; 

// Handle role selection
document.querySelectorAll(".role-btn").forEach(button => {
    button.addEventListener("click", function () {
        document.querySelectorAll(".role-btn").forEach(btn => btn.classList.remove("active"));
        this.classList.add("active");
        selectedRole = this.getAttribute("data-role");
    });
});

// Handle form submission
document.getElementById("login-form").addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent form refresh

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    // Ensure a role is selected
    const activeRoleButton = document.querySelector(".role-btn.active");
    if (!activeRoleButton) {
        alert("Please select a role (Student or Teacher)");
        return;
    }
    const activeRole = activeRoleButton.dataset.role;

    // Debugging: Console output
    console.log("Login attempt:", { username, password, role: activeRole });

    // Validate credentials
    if (users[username] && users[username].password === password && users[username].role === activeRole) {
        //alert("Login successful!");

        // Store session data
        localStorage.setItem("userRole", activeRole);
        localStorage.setItem("username", username);

        // Redirect user based on role
        setTimeout(() => {
            window.location.href = activeRole === "student" ? "../Homepage/student_home.html" : "../Home page/teacher_home.html";
        }, 100);
    } else {
        alert("Invalid username, password, or role selection.");
    }
});

// Check if user is already logged in and redirect
