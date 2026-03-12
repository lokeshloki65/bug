import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCoPbuv5rMSNKmaThp0W5FaXJNp4QKgIh0",
  authDomain: "code-bug-f6be4.firebaseapp.com",
  projectId: "code-bug-f6be4",
  storageBucket: "code-bug-f6be4.firebasestorage.app",
  messagingSenderId: "414285279691",
  appId: "1:414285279691:web:7c31d180379e3b2366864e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

export { auth, db, rtdb };
