import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
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
let otList = []; 
let isLoginMode = true;
let userBasicSalary = 2500; 

window.paparNotification = function(mesej, jenis = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast-item toast-${jenis}`;
    let icon = '<i class="fas fa-check-circle" style="color: #34c759;"></i>';
    if (jenis === 'danger') icon = '<i class="fas fa-times-circle" style="color: #ff3b30;"></i>';
    if (jenis === 'warning') icon = '<i class="fas fa-exclamation-circle" style="color: #ffcc00;"></i>';
    toast.innerHTML = `${icon} <span>${mesej}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOutToast 0.3s ease forwards';
        setTimeout(() => { toast.remove(); }, 300);
    }, 4000);
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar-menu');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
};

function tetapkanTarikhDefault() {
    const dateEl = document.getElementById('ot-date');
    if (dateEl) {
        const today = new Date().toISOString().split('T')[0];
        dateEl.value = today;
    }
}

window.tambahKeSenaraiTempatan = function(event) {
    if (event) event.preventDefault();
    const dateEl = document.getElementById('ot-date');
    const taskReasonEl = document.getElementById('ot-reason');
    const rateMultiplierEl = document.getElementById('ot-rate');
    const hoursWorkedEl = document.getElementById('ot-hours');
    
    if (!dateEl || !taskReasonEl || !rateMultiplierEl || !hoursWorkedEl) return;

    const tarikhMentah = dateEl.value; 
    const susunTarikh = tarikhMentah.split('-').reverse().join('/');
    const originalTaskName = taskReasonEl.value;
    const selectedRate = parseFloat(rateMultiplierEl.value);
    const totalHoursInput = parseFloat(hoursWorkedEl.value);
    const baseGroupId = "GRP-" + Date.now().toString().slice(-5);

    if (selectedRate === 3.0) {
        if (totalHoursInput > 8) {
            otList.push({
                id: "TX-" + Date.now().toString().slice(-5) + "-A",
                groupId: baseGroupId, otDate: susunTarikh,
                taskName: `${originalTaskName} (PH Normal)`,
                rateFactor: 2.0, hoursCount: 8.0
            });
            otList.push({
                id: "TX-" + (Date.now() + 1).toString().slice(-5) + "-B",
                groupId: baseGroupId, otDate: susunTarikh,
                taskName: `${originalTaskName} (PH OT)`,
                rateFactor: 3.0, hoursCount: totalHoursInput - 8
            });
        } else {
            otList.push({
                id: "TX-" + Date.now().toString().slice(-5),
                groupId: baseGroupId, otDate: susunTarikh,
                taskName: `${originalTaskName} (PH Normal)`,
                rateFactor: 2.0, hoursCount: totalHoursInput
            });
        }
    } else {
        otList.push({
            id: "TX-" + Date.now().toString().slice(-5),
            groupId: baseGroupId, otDate: susunTarikh,
            taskName: originalTaskName,
            rateFactor: selectedRate, hoursCount: totalHoursInput
        });
    }
    taskReasonEl.value = ""; 
    tetapkanTarikhDefault();
    window.renderTable();
    window.paparNotification("Draf tugasan berjaya dimasukkan ke senarai.", "success");
};

window.padamDrafTempatan = function(index) {
    const targetItem = otList[index];
    if (targetItem && targetItem.groupId) {
        otList = otList.filter(item => item.groupId !== targetItem.groupId);
    } else {
        otList.splice(index, 1);
    }
    window.renderTable();
    window.paparNotification("Draf berjaya dikeluarkan.", "warning");
};

window.simpanKeCloud = async function() {
    if (!currentUser) return window.paparNotification("Sesi tamat: Sila log masuk semula.", "danger");
    if (otList.length === 0) return window.paparNotification("Tiada rekod draf OT aktif untuk disimpan.", "warning");

    try {
        const docRef = doc(db, "users_ot", currentUser.uid);
        const docSnap = await getDoc(docRef);
        let existingRecords = [];
        if (docSnap.exists() && docSnap.data().activeRecords) {
            existingRecords = docSnap.data().activeRecords;
        }

        const combinedRecords = existingRecords.concat(otList);
        await setDoc(docRef, {
            activeRecords: combinedRecords,
            lastCommittedTime: new Date().toISOString()
        }, { merge: true });
        
        window.paparNotification("Semua rekod aktif berjaya dihantar ke Cloud!", "success");
        otList = []; 
        window.renderTable(); 
    } catch (error) {
        window.paparNotification("Gagal menyimpan ke cloud: " + error.message, "danger");
    }
};

window.renderTable = function() {
    const tableBody = document.getElementById('ot-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    let hours15 = 0, pay15 = 0; let hours20 = 0, pay20 = 0; let hours30 = 0, pay30 = 0;
    let grandTotalPay = 0;
    const hourlyRate = userBasicSalary / 26 / 8;

    const indicatorEl = document.getElementById('salary-indicator');
    if (indicatorEl) indicatorEl.innerText = `Hourly Rate: RM ${hourlyRate.toFixed(2)}/hour`;

    if (otList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px 0;">No active draft records found.</td></tr>`;
        document.getElementById('breakdown-1-5').innerText = "0.0 hours (RM 0.00)";
        document.getElementById('breakdown-2-0').innerText = "0.0 hours (RM 0.00)";
        document.getElementById('breakdown-3-0').innerText = "0.0 hours (RM 0.00)";
        document.getElementById('grand-total-val').innerText = "RM 0.00";
        return;
    }

    otList.forEach((row, idx) => {
        const itemResultPay = hourlyRate * row.hoursCount * row.rateFactor;
        grandTotalPay += itemResultPay;

        if (row.rateFactor === 1.5) { hours15 += row.hoursCount; pay15 += itemResultPay; }
        else if (row.rateFactor === 2.0) { hours20 += row.hoursCount; pay20 += itemResultPay; }
        else if (row.rateFactor === 3.0) { hours30 += row.hoursCount; pay30 += itemResultPay; }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color: var(--text-muted); font-variant-numeric: tabular-nums;">${idx + 1}</td>
            <td style="color: var(--text-muted); font-weight: 500;">${row.otDate || "-"}</td>
            <td style="font-weight: 500;">${row.taskName}</td>
            <td style="font-weight: 600; color: var(--brand-blue);">${row.rateFactor.toFixed(1)}x</td>
            <td style="font-variant-numeric: tabular-nums;">${row.hoursCount.toFixed(1)} hrs</td>
            <td style="font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums;">RM ${itemResultPay.toFixed(2)}</td>
            <td style="text-align: right;"><button onclick="window.padamDrafTempatan(${idx})" class="row-delete-trigger"><i class="fas fa-times"></i> Clear</button></td>
        `;
        tableBody.appendChild(tr);
    });

    document.getElementById('breakdown-1-5').innerText = `${hours15.toFixed(1)} hours (RM ${pay15.toFixed(2)})`;
    document.getElementById('breakdown-2-0').innerText = `${hours20.toFixed(1)} hours (RM ${pay20.toFixed(2)})`;
    document.getElementById('breakdown-3-0').innerText = `${hours30.toFixed(1)} hours (RM ${pay30.toFixed(2)})`;
    document.getElementById('grand-total-val').innerText = `RM ${grandTotalPay.toFixed(2)}`;
};

/* --- AUTH UI LOGIC UNTUK LOGIN.HTML --- */
window.toggleAuthMode = function() {
    isLoginMode = !isLoginMode;
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    if (isLoginMode) {
        if (submitBtn) submitBtn.innerText = "Log In";
        if (toggleText) toggleText.innerText = "Don't have an account? Register Now";
    } else {
        if (submitBtn) submitBtn.innerText = "Register Account";
        if (toggleText) toggleText.innerText = "Already have an account? Log In";
    }
};

window.kendalikanAutentikasi = async function(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('auth-email')?.value;
    const password = document.getElementById('auth-password')?.value;
    try {
        if (isLoginMode) { 
            await signInWithEmailAndPassword(auth, email, password); 
            window.paparNotification("Selamat kembali! Memuatkan akaun...", "success");
        } else { 
            await createUserWithEmailAndPassword(auth, email, password);
            window.paparNotification("Pendaftaran berjaya! Sila isi profi anda.", "success");
        }
    } catch (error) { window.paparNotification("Ralat Autentikasi: " + error.message, "danger"); }
};

window.logKeluarSistem = async function() {
    try { 
        await signOut(auth); 
        window.location.href = "login.html"; // Terus hantar ke login page bila logout
    } catch (error) { console.error(error); }
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

function processSystemClock() {
    const clockEl = document.getElementById('current-time');
    if (clockEl) {
        const timestampSiri = new Date();
        clockEl.innerText = timestampSiri.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
}

/* =========================================================================
   REAL-TIME LISTENER (DENGAN PAGE ROUTER PINTAR)
   ========================================================================= */
onAuthStateChanged(auth, async (user) => {
    const isLoginPage = document.getElementById('auth-container') !== null;
    const dashboardContainer = document.getElementById('dashboard-container');
    const pageLoader = document.getElementById('page-loader');

    if (user) {
        currentUser = user;
        
        // 1. Jika dah log masuk tapi berada di login.html, tendang ke index.html
        if (isLoginPage) {
            window.location.href = "index.html";
            return;
        }

        // 2. Jika berada di Dashboard (index.html)
        if (dashboardContainer) {
            try {
                const docRef = doc(db, "users_ot", user.uid);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists() && docSnap.data().basicSalaryProfile) {
                    const cloudData = docSnap.data();
                    otList = []; 
                    userBasicSalary = parseFloat(cloudData.basicSalaryProfile) || 2500;
                    
                    // Sembunyikan loader, tunjukkan dashboard
                    if (pageLoader) pageLoader.style.display = 'none';
                    dashboardContainer.style.display = 'block';
                    
                    const logoutBtn = document.getElementById('logout-btn');
                    const menuTriggerBtn = document.getElementById('menu-trigger-btn');
                    if (logoutBtn) logoutBtn.style.display = 'inline-block';
                    if (menuTriggerBtn) menuTriggerBtn.style.display = 'flex';
                    
                    const greetingEl = document.getElementById('dashboard-greeting');
                    if (greetingEl) greetingEl.innerText = `Hi, ${cloudData.nickName || cloudData.employeeName || "User"}!`;
                } else { 
                    window.location.href = "profile-settings.html";
                    return;
                }
            } catch (error) { console.error(error); }
        }
    } else {
        currentUser = null; 
        otList = [];
        // Jika belum log masuk dan BUKAN di login.html, tendang ke login.html
        if (!isLoginPage) {
            window.location.href = "login.html";
        }
    }
    
    if (!isLoginPage) {
        window.renderTable();
        tetapkanTarikhDefault();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    setInterval(processSystemClock, 1000);
    processSystemClock();
    if (!document.getElementById('auth-container')) tetapkanTarikhDefault();
});