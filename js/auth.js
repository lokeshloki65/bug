// Fix auth redirect - if already logged in, skip login page
import { auth, db } from './firebase-init.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Auto-redirect if already logged in (prevents repeated login)
onAuthStateChanged(auth, async (user) => {
  if (user && document.getElementById('loginForm')) {
    // Already logged in, redirect away from login page
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const role = userDoc.data().role;
      redirectUser(role);
    }
  }
});

const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = window.getSelectedRole ? window.getSelectedRole() : 'student';

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.textContent = 'CONNECTING...'; submitBtn.disabled = true; }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === role) {
          redirectUser(role);
        } else {
          await signOut(auth);
          showError(`ACCESS DENIED: You are registered as a ${userData.role.toUpperCase()}.`);
        }
      } else {
        showError("ACCOUNT NOT FOUND. Contact your administrator.");
      }
    } catch (error) {
      console.error(error);
      showError("LOGIN FAILED: Invalid email or password.");
    }

    if (submitBtn) { submitBtn.textContent = 'INITIALIZE SESSION'; submitBtn.disabled = false; }
  });
}

function showError(msg) {
  if (loginError) { loginError.textContent = msg; loginError.style.display = 'block'; }
}

function redirectUser(role) {
  if (role === 'admin') {
    window.location.href = 'admin/dashboard.html';
  } else {
    window.location.href = 'student/dashboard.html';
  }
}

export function checkAuth(requiredRole) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Determine correct path depth
      const depth = window.location.pathname.split('/').filter(Boolean).length;
      window.location.href = depth > 1 ? '../index.html' : 'index.html';
      return;
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (requiredRole && userData.role !== requiredRole) {
        const depth = window.location.pathname.split('/').filter(Boolean).length;
        window.location.href = depth > 1 ? '../index.html' : 'index.html';
      }
    } else {
      const depth = window.location.pathname.split('/').filter(Boolean).length;
      window.location.href = depth > 1 ? '../index.html' : 'index.html';
    }
  });
}

export async function logout() {
  await signOut(auth);
  window.location.href = '../index.html';
}
