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
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables
let selectedRole = "student";
let isAutoRedirectEnabled = true; // Control automatic redirect

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log("Page loaded, initializing login system...");
    initializeRoleSelection();
    initializeFormHandlers();
    checkAuthState();
    addLogoutButton();
});

// Add logout button for already logged in users
function addLogoutButton() {
    const loginBox = document.querySelector('.login-box');
    if (loginBox) {
        const logoutDiv = document.createElement('div');
        logoutDiv.className = 'logout-section';
        logoutDiv.innerHTML = `
            <div class="current-user-info" id="current-user-info" style="display: none;">
                <p><i class="fas fa-user"></i> Currently logged in as: <span id="current-user-email"></span></p>
                <button type="button" id="logout-btn" class="logout-btn">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
                <button type="button" id="continue-btn" class="continue-btn">
                    <i class="fas fa-arrow-right"></i> Continue to Dashboard
                </button>
            </div>
        `;
        loginBox.appendChild(logoutDiv);
        
        // Add event listeners
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
        document.getElementById('continue-btn').addEventListener('click', handleContinue);
    }
}

// Handle logout
async function handleLogout() {
    try {
        await auth.signOut();
        localStorage.removeItem("userRole");
        localStorage.removeItem("username");
        localStorage.removeItem("userId");
        
        // Hide user info and show login form
        document.getElementById('current-user-info').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
        document.querySelector('.register-link').style.display = 'block';
        document.querySelector('.admin-link').style.display = 'block';
        
        showMessage("Logged out successfully!", "success");
        console.log("User logged out successfully");
    } catch (error) {
        console.error("Logout error:", error);
        showMessage("Error logging out. Please try again.", "error");
    }
}

// Handle continue to dashboard
function handleContinue() {
    const userRole = localStorage.getItem("userRole");
    if (userRole) {
        const redirectUrl = userRole === "student" ? 
            "../Homepage/student_home.html" : 
            "../Teachers homepage/teacher_home.html";
        window.location.href = redirectUrl;
    }
}

// Initialize role selection
function initializeRoleSelection() {
    console.log("Initializing role selection...");
    document.querySelectorAll(".role-btn").forEach(button => {
        button.addEventListener("click", function () {
            document.querySelectorAll(".role-btn").forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");
            selectedRole = this.getAttribute("data-role");
            console.log("Role selected:", selectedRole);
        });
    });
}

// Initialize form handlers
function initializeFormHandlers() {
    console.log("Initializing form handlers...");
    
    // Handle form submission
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
        console.log("Login form handler attached");
    } else {
        console.error("Login form not found!");
    }
    
    // Handle forgot password
    const forgotPasswordLink = document.querySelector(".forgot-password");
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener("click", handleForgotPassword);
    }
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    console.log("Login attempt started...");

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    console.log("Email:", email);
    console.log("Password length:", password.length);

    // Validate inputs
    if (!email || !password) {
        showMessage("Please enter both email and password.", "error");
        return;
    }

    // Ensure a role is selected
    const activeRoleButton = document.querySelector(".role-btn.active");
    if (!activeRoleButton) {
        showMessage("Please select a role (Student or Teacher)", "error");
        return;
    }
    const activeRole = activeRoleButton.dataset.role;
    console.log("Selected role:", activeRole);

    // Show loading state
    const loginBtn = document.querySelector(".login-btn");
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    loginBtn.disabled = true;

    try {
        console.log("Attempting Firebase authentication...");
        
        // Sign in with Firebase
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log("Firebase authentication successful, user:", user.uid);

        // Check if user exists in Firestore and verify role
        console.log("Checking user role in Firestore...");
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            console.log("User data from Firestore:", userData);
            
            if (userData.role === activeRole) {
                // Role matches, proceed with login
                console.log("Role matches, proceeding with login...");
                showMessage("Login successful! Redirecting...", "success");
                
                // Store session data
                localStorage.setItem("userRole", activeRole);
                localStorage.setItem("username", userData.name || email);
                localStorage.setItem("userId", user.uid);

                // Redirect user based on role
                setTimeout(() => {
                    const redirectUrl = activeRole === "student" ? 
                        "../Homepage/student_home.html" : 
                        "../Teachers homepage/teacher_home.html";
                    console.log("Redirecting to:", redirectUrl);
                    window.location.href = redirectUrl;
                }, 1000);
            } else {
                // Role doesn't match
                console.log("Role mismatch. Expected:", activeRole, "Found:", userData.role);
                await auth.signOut();
                showMessage(`This account is registered as a ${userData.role}, not a ${activeRole}.`, "error");
            }
        } else {
            // User doesn't exist in Firestore, create new user document
            console.log("User not found in Firestore, creating new user document...");
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
                const redirectUrl = activeRole === "student" ? 
                    "../Homepage/student_home.html" : 
                    "../Teachers homepage/teacher_home.html";
                console.log("Redirecting to:", redirectUrl);
                window.location.href = redirectUrl;
            }, 1000);
        }
    } catch (error) {
        console.error("Login error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        
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
            case 'auth/network-request-failed':
                errorMessage = "Network error. Please check your internet connection.";
                break;
            case 'auth/user-disabled':
                errorMessage = "This account has been disabled.";
                break;
        }
        
        showMessage(errorMessage, "error");
    } finally {
        // Reset button state
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

// Handle forgot password
async function handleForgotPassword(event) {
    event.preventDefault();
    const email = document.getElementById("email").value.trim();
    
    if (!email) {
        showMessage("Please enter your email address first.", "error");
        return;
    }
    
    try {
        await auth.sendPasswordResetEmail(email);
        showMessage("Password reset email sent! Check your inbox.", "success");
    } catch (error) {
        console.error("Password reset error:", error);
        let errorMessage = "Failed to send reset email. Please try again.";
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = "No account found with this email address.";
                break;
            case 'auth/invalid-email':
                errorMessage = "Invalid email address.";
                break;
        }
        
        showMessage(errorMessage, "error");
    }
}

// Check authentication state
function checkAuthState() {
    console.log("Setting up auth state listener...");
    auth.onAuthStateChanged(function(user) {
        if (user) {
            console.log("User is already signed in:", user.uid);
            // Show current user info instead of auto-redirecting
            showCurrentUserInfo(user);
        } else {
            console.log("No user is signed in");
            // Hide user info and show login form
            hideCurrentUserInfo();
        }
    });
}

// Show current user information
async function showCurrentUserInfo(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Update UI to show current user
            document.getElementById('current-user-email').textContent = user.email;
            document.getElementById('current-user-info').style.display = 'block';
            
            // Hide login form
            document.getElementById('login-form').style.display = 'none';
            document.querySelector('.register-link').style.display = 'none';
            document.querySelector('.admin-link').style.display = 'none';
            
            console.log("Showing current user info for:", user.email);
        }
    } catch (error) {
        console.error("Error getting user info:", error);
    }
}

// Hide current user information
function hideCurrentUserInfo() {
    document.getElementById('current-user-info').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.querySelector('.register-link').style.display = 'block';
    document.querySelector('.admin-link').style.display = 'block';
}

// Show message function
function showMessage(message, type = 'error') {
    console.log("Showing message:", message, "Type:", type);
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        // Hide message after 5 seconds
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    } else {
        console.error("Message div not found!");
        alert(message); // Fallback to alert
    }
}
