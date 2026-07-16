import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = { 
    apiKey: "AIzaSyAYQ9UKq6teDdfleoCfG_-kjiIf6Gj0DNc", 
    authDomain: "ot-tracker-pro-64415.firebaseapp.com", 
    projectId: "ot-tracker-pro-64415" 
};
const app = initializeApp(firebaseConfig); 
const auth = getAuth(app); 
const db = getFirestore(app);

let currentUser = null;
let basicSalary = 0;
let draftOTList = [];

// =========================================================================
// PREMIUM ENGLISH TOAST NOTIFICATION
// =========================================================================
function showPremiumToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-success' : (type === 'error' ? 'bg-danger' : 'bg-warning');
    const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle');
    
    toast.className = `p-3 rounded-3 text-white shadow-lg d-flex align-items-center gap-3 animate-popup ${bgColor} bg-opacity-90`;
    toast.style.backdropFilter = "blur(12px)";
    toast.style.border = "1px solid rgba(255,255,255,0.2)";
    toast.style.minWidth = "250px";
    
    toast.innerHTML = `<i class="fas ${icon} fs-4"></i><div class="fw-bold">${message}</div>`;
    container.appendChild(toast);
    
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        toast.style.transform = 'translateX(120%)'; 
        toast.style.transition = 'all 0.4s ease'; 
        setTimeout(() => toast.remove(), 400); 
    }, 3000);
}

// =========================================================================
// AUTHENTICATION LOGIC (DASHBOARD)
// =========================================================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        try {
            const userDocRef = doc(db, "users_ot", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                basicSalary = parseFloat(data.basicSalaryProfile) || 0;
                const hourlyRate = (basicSalary / 26 / 8).toFixed(2);
                
                const greetingEl = document.getElementById('dashboard-greeting');
                const salaryEl = document.getElementById('salary-indicator');
                if(greetingEl) greetingEl.innerText = `Welcome back, ${data.nicknameProfile || 'User'}!`;
                if(salaryEl) salaryEl.innerText = `Hourly Rate: RM ${hourlyRate}/hour`;
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    } else {
        // Kalau tak login, tendang balik ke login.html
        window.location.replace("login.html");
    }
});

// =========================================================================
// DRAFT MANAGEMENT LOGIC
// =========================================================================
window.tambahKeSenaraiTempatan = function(e) {
    e.preventDefault();
    const dateInput = document.getElementById('ot-date').value;
    const reasonInput = document.getElementById('ot-reason').value.trim();
    const rateInput = parseFloat(document.getElementById('ot-rate').value);
    const hoursInput = parseFloat(document.getElementById('ot-hours').value);

    draftOTList.push({ 
        otDate: dateInput, 
        taskDesc: reasonInput, 
        rateFactor: rateInput, 
        hoursCount: hoursInput 
    });

    document.getElementById('ot-input-form').reset();
    document.getElementById('ot-date').value = new Date().toISOString().split('T')[0];
    
    const modalEl = document.getElementById('ot-modal');
    if(modalEl) {
        const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modalInstance.hide();
    }
    
    renderDraftTable();
    showPremiumToast("Task added to draft successfully!", "success");
};

function renderDraftTable() {
    const tbody = document.getElementById('ot-table-body');
    if (!tbody) return;

    if (draftOTList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary py-4">No drafts added yet.</td></tr>`;
        updateBreakdown();
        return;
    }

    tbody.innerHTML = "";
    let hourlyRate = basicSalary > 0 ? (basicSalary / 26 / 8) : 0;

    draftOTList.forEach((item, index) => {
        let pay = hourlyRate * item.hoursCount * item.rateFactor;
        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td><span class="badge bg-secondary bg-opacity-50">${item.otDate}</span></td>
                <td class="fw-semibold">${item.taskDesc}</td>
                <td>${item.rateFactor.toFixed(1)}x</td>
                <td>${item.hoursCount.toFixed(1)}h</td>
                <td class="text-success fw-bold">RM ${pay.toFixed(2)}</td>
                <td class="text-end">
                    <button onclick="window.padamDraft(${index})" class="btn btn-sm btn-outline-danger border-0"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    updateBreakdown();
}

window.padamDraft = function(index) {
    draftOTList.splice(index, 1);
    renderDraftTable();
    showPremiumToast("Draft task removed.", "warning");
};

function updateBreakdown() {
    let total1_5 = 0, total2_0 = 0, total3_0 = 0;
    let grandTotalPay = 0;
    let hourlyRate = basicSalary > 0 ? (basicSalary / 26 / 8) : 0;

    draftOTList.forEach(item => {
        if (item.rateFactor === 1.5) total1_5 += item.hoursCount;
        if (item.rateFactor === 2.0) total2_0 += item.hoursCount;
        if (item.rateFactor === 3.0) total3_0 += item.hoursCount;
        grandTotalPay += (hourlyRate * item.hoursCount * item.rateFactor);
    });

    const el15 = document.getElementById('breakdown-1-5');
    const el20 = document.getElementById('breakdown-2-0');
    const el30 = document.getElementById('breakdown-3-0');
    const elGrand = document.getElementById('grand-total-val');
    
    if(el15) el15.innerText = `${total1_5.toFixed(1)}h`;
    if(el20) el20.innerText = `${total2_0.toFixed(1)}h`;
    if(el30) el30.innerText = `${total3_0.toFixed(1)}h`;
    if(elGrand) elGrand.innerText = `RM ${grandTotalPay.toFixed(2)}`;
}

// =========================================================================
// COMMIT TO CLOUD FUNCTION
// =========================================================================
window.simpanKeCloud = async function() {
    if (!currentUser) {
        showPremiumToast("Authentication error. Please login again.", "error");
        return;
    }
    
    if (draftOTList.length === 0) {
        showPremiumToast("Draft is empty! Please add tasks first.", "warning");
        return;
    }

    const btn = document.querySelector('button[onclick="window.simpanKeCloud()"]');
    if(!btn) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>Committing...`;
    btn.disabled = true;

    try {
        const userDocRef = doc(db, "users_ot", currentUser.uid);
        
        const recordsToSave = draftOTList.map(item => ({
            ...item,
            recordId: `ot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString()
        }));

        await updateDoc(userDocRef, {
            activeRecords: arrayUnion(...recordsToSave)
        });

        draftOTList = [];
        renderDraftTable();
        showPremiumToast("Data successfully committed to Cloud!", "success");

    } catch (error) {
        console.error("Cloud Commit Error: ", error);
        showPremiumToast(`Failed to commit: ${error.message}`, "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

// =========================================================================
// LOGOUT UTILITY
// =========================================================================
window.logKeluarSistem = async function() {
    try { 
        await signOut(auth); 
        window.location.replace("login.html"); 
    } catch (error) { 
        console.error(error); 
        showPremiumToast("Logout failed.", "error");
    }
};

// =========================================================================
// PREMIUM UI & ANIMATION INITIALIZATION
// =========================================================================
function initPremiumUI() {
    const canvas = document.getElementById('bg-canvas');
    if(canvas && typeof THREE !== 'undefined') {
        const scene = new THREE.Scene(); 
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true }); 
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        const geom = new THREE.BufferGeometry(); 
        const posArray = new Float32Array(500 * 3);
        for(let i=0; i<500*3; i++) posArray[i] = (Math.random() - 0.5) * 10;
        geom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        
        const mat = new THREE.PointsMaterial({ size: 0.005, color: 0x0d6efd }); 
        const mesh = new THREE.Points(geom, mat); 
        scene.add(mesh); 
        camera.position.z = 3;
        
        function animate() { 
            requestAnimationFrame(animate); 
            mesh.rotation.y += 0.001; 
            renderer.render(scene, camera); 
        } 
        animate();
    }
    
    if (typeof gsap !== 'undefined') {
        gsap.to(".gsap-element", { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power3.out" });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initPremiumUI(); 
    
    const otRateSelect = document.getElementById('ot-rate');
    if (otRateSelect && typeof Choices !== 'undefined') {
        new Choices(otRateSelect, { 
            searchEnabled: false, 
            itemSelectText: '', 
            shouldSort: false 
        });
    }
    
    const dateInput = document.getElementById('ot-date');
    if(dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
});