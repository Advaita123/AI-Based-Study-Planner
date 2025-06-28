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
document.getElementById("login-form").addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent form refresh

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    // Ensure a role is selected
    const activeRoleButton = document.querySelector(".role-btn.active");
    if (!activeRoleButton) {
        showMessage("Please select a role (Student or Teacher)", "error");
        return;
    }
    const activeRole = activeRoleButton.dataset.role;

    // Show loading state
    const loginBtn = document.querySelector(".login-btn");
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    loginBtn.disabled = true;

    try {
        // Sign in with Firebase
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Check if user exists in Firestore and verify role
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.role === activeRole) {
                // Role matches, proceed with login
                showMessage("Login successful! Redirecting...", "success");
                
                // Store session data
                localStorage.setItem("userRole", activeRole);
                localStorage.setItem("username", userData.name || email);
                localStorage.setItem("userId", user.uid);

                // Redirect user based on role
                setTimeout(() => {
                    window.location.href = activeRole === "student" ? 
                        "../Homepage/student_home.html" : 
                        "../Teachers homepage/teacher_home.html";
                }, 1000);
            } else {
                // Role doesn't match
                await auth.signOut();
                showMessage(`This account is registered as a ${userData.role}, not a ${activeRole}.`, "error");
            }
        } else {
            // User doesn't exist in Firestore, create new user document
            await db.collection('users').doc(user.uid).set({
                email: email,
                role: activeRole,
                name: email.split('@')[0], // Use email prefix as name
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showMessage("Account created successfully! Redirecting...", "success");
            
            // Store session data
            localStorage.setItem("userRole", activeRole);
            localStorage.setItem("username", email.split('@')[0]);
            localStorage.setItem("userId", user.uid);

            // Redirect user based on role
            setTimeout(() => {
                window.location.href = activeRole === "student" ? 
                    "../Homepage/student_home.html" : 
                    "../Teachers homepage/teacher_home.html";
            }, 1000);
        }
    } catch (error) {
        console.error("Login error:", error);
        
        // Handle specific Firebase auth errors
        let errorMessage = "Login failed. Please try again.";
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = "No account found with this email address.";
                break;
            case 'auth/wrong-password':
                errorMessage = "Incorrect password.";
                break;
            case 'auth/invalid-email':
                errorMessage = "Invalid email address.";
                break;
            case 'auth/too-many-requests':
                errorMessage = "Too many failed attempts. Please try again later.";
                break;
        }
        
        showMessage(errorMessage, "error");
    } finally {
        // Reset button state
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
});

// Handle register link click
document.getElementById("register-link").addEventListener("click", function(event) {
    event.preventDefault();
    showMessage("Registration will be available soon!", "info");
});

// Handle forgot password
document.querySelector(".forgot-password").addEventListener("click", function(event) {
    event.preventDefault();
    const email = document.getElementById("email").value.trim();
    
    if (!email) {
        showMessage("Please enter your email address first.", "error");
        return;
    }
    
    auth.sendPasswordResetEmail(email)
        .then(() => {
            showMessage("Password reset email sent! Check your inbox.", "success");
        })
        .catch((error) => {
            console.error("Password reset error:", error);
            showMessage("Failed to send reset email. Please try again.", "error");
        });
});

// Check if user is already logged in and redirect
