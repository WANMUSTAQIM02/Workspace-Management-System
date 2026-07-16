import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyAYQ9UKq6teDdfleoCfG_-kjiIf6Gj0DNc", authDomain: "ot-tracker-pro-64415.firebaseapp.com", projectId: "ot-tracker-pro-64415", storageBucket: "ot-tracker-pro-64415.firebasestorage.app", messagingSenderId: "941888808954", appId: "1:941888808954:web:e40f19a0cec8a2f4272643" };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

// PREMIUM UI ENGINE INJECTION
function initPremiumUI() {
    const canvas = document.getElementById('bg-canvas');
    if(canvas) {
        const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true }); renderer.setSize(window.innerWidth, window.innerHeight);
        const geom = new THREE.BufferGeometry(); const posArray = new Float32Array(500 * 3);
        for(let i=0; i<500*3; i++) posArray[i] = (Math.random() - 0.5) * 10;
        geom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const mat = new THREE.PointsMaterial({ size: 0.005, color: 0x0d6efd }); const mesh = new THREE.Points(geom, mat); scene.add(mesh); camera.position.z = 3;
        function animate() { requestAnimationFrame(animate); mesh.rotation.y += 0.001; renderer.render(scene, camera); } animate();
        gsap.to(".gsap-element", { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" });
    }
}

window.logKeluarSistem = async function() { try { await signOut(auth); window.location.href = "login.html"; } catch (e) { console.error(e); } };

window.kemaskiniProfilCloud = async function(event) {
    if (event) event.preventDefault(); if (!currentUser) return;
    const nameVal = document.getElementById('profile-name').value;
    const nickNameVal = document.getElementById('profile-nickname').value;
    const salaryVal = parseFloat(document.getElementById('profile-salary').value) || 2500;
    const staffIdVal = document.getElementById('profile-staff-id').value;
    const submitBtn = document.querySelector('#profile-settings-form button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`; }
    try {
        await setDoc(doc(db, "users_ot", currentUser.uid), { employeeName: nameVal, nickName: nickNameVal, basicSalaryProfile: salaryVal, staffId: staffIdVal }, { merge: true });
        alert("Profile update synchronized successfully.");
    } catch (error) { alert("Failed to update: " + error.message); } 
    finally { if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = `<i class="fas fa-save me-2"></i>Save Modifications`; } }
};

onAuthStateChanged(auth, async (user) => {
    const pageLoader = document.getElementById('page-loader'); const mainUi = document.getElementById('main-ui');
    if (user) {
        currentUser = user;
        if (document.getElementById('profile-email-display')) document.getElementById('profile-email-display').value = user.email;
        try {
            const docSnap = await getDoc(doc(db, "users_ot", user.uid));
            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                if (document.getElementById('profile-name')) document.getElementById('profile-name').value = cloudData.employeeName || "";
                if (document.getElementById('profile-nickname')) document.getElementById('profile-nickname').value = cloudData.nickName || "";
                if (document.getElementById('profile-salary')) document.getElementById('profile-salary').value = cloudData.basicSalaryProfile || "2500";
                if (document.getElementById('profile-staff-id')) document.getElementById('profile-staff-id').value = cloudData.staffId || "";
            }
        } catch (error) { console.error("Ralat profil:", error); }
        
        // === FIX UTAMA DI SINI ===
        if (pageLoader) {
            pageLoader.classList.remove('d-flex'); // Buang d-flex (sebab d-flex ada !important)
            pageLoader.style.display = 'none';     // Sembunyikan loader
        }
        if (mainUi) mainUi.style.display = 'flex';
        // =========================
        
    } else { window.location.href = "login.html"; }
});

document.addEventListener('DOMContentLoaded', initPremiumUI);