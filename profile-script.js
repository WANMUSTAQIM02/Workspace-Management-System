import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAYQ9UKq6teDdfleoCfG_-kjiIf6Gj0DNc", 
  authDomain: "ot-tracker-pro-64415.firebaseapp.com",
  projectId: "ot-tracker-pro-64415",
  storageBucket: "ot-tracker-pro-64415.firebasestorage.app",
  messagingSenderId: "941888808954",
  appId: "1:941888808954:web:e40f19a0cec8a2f4272643"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar-menu');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
};

window.toggleTheme = function() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    if (body.classList.contains('dark-theme')) {
        body.classList.replace('dark-theme', 'light-theme');
        if (themeIcon) themeIcon.classList.replace('fa-moon', 'fa-sun');
    } else {
        body.classList.replace('light-theme', 'dark-theme');
        if (themeIcon) themeIcon.classList.replace('fa-sun', 'fa-moon');
    }
};

window.logKeluarSistem = async function() {
    try { await signOut(auth); window.location.href = "index.html"; } catch (error) { console.error(error); }
};

window.kemaskiniProfilCloud = async function(event) {
    if (event) event.preventDefault();
    if (!currentUser) return;

    const nameVal = document.getElementById('profile-name').value;
    const nickNameVal = document.getElementById('profile-nickname').value;
    const salaryVal = parseFloat(document.getElementById('profile-salary').value) || 2500;
    const staffIdVal = document.getElementById('profile-staff-id').value;

    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;
    }

    try {
        await setDoc(doc(db, "users_ot", currentUser.uid), {
            employeeName: nameVal,
            nickName: nickNameVal, 
            basicSalaryProfile: salaryVal,
            staffId: staffIdVal
        }, { merge: true });

        alert("Profile update synchronized successfully.");
    } catch (error) {
        alert("Failed to update profile configurations: " + error.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fas fa-save" style="margin-right: 8px;"></i> Save Modifications`;
        }
    }
};

function processSystemClock() {
    const clockEl = document.getElementById('current-time');
    if (clockEl) {
        const timestampSiri = new Date();
        clockEl.innerText = timestampSiri.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        if (document.getElementById('profile-email-display')) {
            document.getElementById('profile-email-display').value = user.email;
        }

        try {
            const docRef = doc(db, "users_ot", user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                if (document.getElementById('profile-name')) document.getElementById('profile-name').value = cloudData.employeeName || "";
                if (document.getElementById('profile-nickname')) document.getElementById('profile-nickname').value = cloudData.nickName || "";
                if (document.getElementById('profile-salary')) document.getElementById('profile-salary').value = cloudData.basicSalaryProfile || "2500";
                if (document.getElementById('profile-staff-id')) document.getElementById('profile-staff-id').value = cloudData.staffId || "";
            }
        } catch (error) { console.error(error); }
    } else {
        window.location.href = "index.html";
    }
});

document.addEventListener('DOMContentLoaded', () => {
    setInterval(processSystemClock, 1000);
    processSystemClock();
    
    const profileForm = document.getElementById('profile-settings-form');
    if (profileForm) {
        profileForm.addEventListener('submit', window.kemaskiniProfilCloud);
    }
});
onAuthStateChanged(auth, async (user) => {
    const pageLoader = document.getElementById('page-loader');
    const profileContainer = document.getElementById('profile-container');

    if (user) {
        // ... masukkan data sedia ada dari Firestore ke dalam input borang ...
        
        // Selesai memetakan data, tutup loader dan paparkan content
        if (pageLoader) pageLoader.style.display = 'none';
        if (profileContainer) profileContainer.style.display = 'block';

        // Tunjukkan navigasi sistem
        document.getElementById('logout-btn').style.display = 'inline-block';
        document.getElementById('menu-trigger-btn').style.display = 'flex';
    } else {
        window.location.href = "login.html";
    }
});