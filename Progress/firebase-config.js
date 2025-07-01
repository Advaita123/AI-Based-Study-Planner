// Firebase configuration for progress tracking
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

// Export for use in other files
window.firebaseAuth = auth;
window.firebaseDB = db; 