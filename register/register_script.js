// Initialize Firebase (assumes firebase-config.js is loaded)
// Uses: firebase, auth, db from firebase-config.js

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('register-form');
    const messageDiv = document.getElementById('message');

    function showMessage(message, type = 'error') {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        // Get form values
        const name = document.getElementById('name').value.trim();
        const age = document.getElementById('age').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Validation
        if (!name || name.length < 2) {
            showMessage('Please enter a valid name (at least 2 characters).');
            return;
        }
        if (!age || isNaN(age) || age < 10 || age > 50) {
            showMessage('Please enter a valid age (10-50).');
            return;
        }
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            showMessage('Please enter a valid email address.');
            return;
        }
        if (!password || password.length < 6) {
            showMessage('Password must be at least 6 characters long.');
            return;
        }
        if (password !== confirmPassword) {
            showMessage('Passwords do not match.');
            return;
        }

        // Register user with Firebase Auth
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            await db.collection('users').doc(user.uid).set({
                name: name,
                age: parseInt(age),
                email: email,
                role: 'student',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showMessage('Registration successful! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } catch (error) {
            let msg = error.message;
            if (error.code === 'auth/email-already-in-use') {
                msg = 'This email is already registered.';
            } else if (error.code === 'auth/invalid-email') {
                msg = 'Invalid email address.';
            } else if (error.code === 'auth/weak-password') {
                msg = 'Password is too weak.';
            }
            showMessage(msg);
        }
    });
}); 