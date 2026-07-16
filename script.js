import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAYQ9UKq6teDdfleoCfG_-kjiIf6Gj0DNc", 
    authDomain: "ot-tracker-pro-64415.firebaseapp.com",
    projectId: "ot-tracker-pro-64415"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let localOTDraft = []; 
let globalBasicSalary = 2500; 
let isRegisterMode = false;  

/* =========================================================================
   PREMIUM UI ENGINE (THREE.JS & GSAP & CHOICES.JS)
   ========================================================================= */
function initPremiumUI() {
    const canvas = document.getElementById('bg-canvas');
    if(canvas) {
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

        function animateBg() {
            requestAnimationFrame(animateBg);
            mesh.rotation.y += 0.001;
            mesh.rotation.x += 0.0005;
            renderer.render(scene, camera);
        }
        animateBg();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    gsap.to(".gsap-element", { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power3.out", delay: 0.1 });

    const selectRate = document.getElementById('ot-rate');
    if (selectRate) new Choices(selectRate, { searchEnabled: false, itemSelectText: '' });
}

/* =========================================================================
   AUTH & DASHBOARD LOGIC (KEKALKAN LOGIC ASAL KAU)
   ========================================================================= */
onAuthStateChanged(auth, async (user) => {
    const namaHalaman = window.location.pathname.split("/").pop();

    if (user) {
        currentUser = user;
        if (namaHalaman === "login.html" || namaHalaman === "") {
            window.location.href = "index.html"; return;
        }
        
        try {
            const docSnap = await getDoc(doc(db, "users_ot", user.uid));
            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                const namaPanggilan = cloudData.nickName || cloudData.employeeName || "User";
                globalBasicSalary = parseFloat(cloudData.basicSalaryProfile) || 2500;
                
                if (document.getElementById('dashboard-greeting')) {
                    document.getElementById('dashboard-greeting').innerHTML = `Welcome back, <span class="text-primary fw-bold">${namaPanggilan}</span>`;
                }
                kemaskiniKadarGajiUI(globalBasicSalary);
            }
        } catch (error) { console.error("Ralat profil:", error); }

    } else {
        currentUser = null;
        if (namaHalaman !== "login.html" && namaHalaman !== "") {
            window.location.href = "login.html";
        }
    }
});

function kemaskiniKadarGajiUI(gaji) {
    const kadarSejam = (gaji / 26) / 8;
    const indicatorEl = document.getElementById('salary-indicator');
    if (indicatorEl) indicatorEl.innerText = `Hourly Rate: RM ${kadarSejam.toFixed(2)}/hour`;
}

window.kendalikanAutentikasi = async function(event) {
    event.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const btn = document.getElementById('auth-submit-btn');
    
    btn.disabled = true; btn.innerText = "Processing...";
    try {
        if (isRegisterMode) await createUserWithEmailAndPassword(auth, email, password);
        else await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        tampilkanNotifikasi("Ralat: " + error.message, "error");
        btn.disabled = false; btn.innerText = isRegisterMode ? "Register Now" : "Initialize Session";
    }
};

window.toggleAuthMode = function() {
    isRegisterMode = !isRegisterMode;
    document.getElementById('auth-title').innerText = isRegisterMode ? "Create Account" : "Welcome Back";
    document.getElementById('auth-desc').innerText = isRegisterMode ? "Sign up to configure your workspace." : "Authenticate to access your secure workspace.";
    document.getElementById('auth-submit-btn').innerText = isRegisterMode ? "Register Now" : "Initialize Session";
    document.getElementById('auth-toggle-text').innerText = isRegisterMode ? "Already have an account? Log In" : "Don't have an account? Request Access";
};

window.logKeluarSistem = async function() {
    await signOut(auth); window.location.href = "login.html";
};

// ⚡ LOGIK AUTO-SPLIT CUTI UMUM (PUBLIC HOLIDAY) KEKAL DI SINI
window.tambahKeSenaraiTempatan = function(event) {
    event.preventDefault();
    const tarikhKerja = document.getElementById('ot-date').value;
    const tugasan = document.getElementById('ot-reason').value;
    const gandaanRate = parseFloat(document.getElementById('ot-rate').value);
    const jumlahJam = parseFloat(document.getElementById('ot-hours').value);
    const kadarAsalSejam = (globalBasicSalary / 26) / 8;

    if (gandaanRate === 3.0 && jumlahJam > 8) {
        localOTDraft.push({ id: Date.now(), tarikhKerja, tugasan: `${tugasan} (PH - 8 Jam Pertama)`, gandaanRate: 2.0, jumlahJam: 8, bayaranHasil: 8 * kadarAsalSejam * 2.0 });
        const lebihanJam = jumlahJam - 8;
        localOTDraft.push({ id: Date.now() + 1, tarikhKerja, tugasan: `${tugasan} (PH - Lebihan Jam OT)`, gandaanRate: 3.0, jumlahJam: lebihanJam, bayaranHasil: lebihanJam * kadarAsalSejam * 3.0 });
    } else {
        const actualRate = (gandaanRate === 3.0) ? 2.0 : gandaanRate; // Fixed user logic for PH <= 8hrs
        localOTDraft.push({ id: Date.now(), tarikhKerja, tugasan: gandaanRate === 3.0 ? `${tugasan} (PH - Waktu Normal)` : tugasan, gandaanRate: actualRate, jumlahJam, bayaranHasil: jumlahJam * kadarAsalSejam * actualRate });
    }

    document.getElementById('ot-input-form').reset();
    document.getElementById('ot-hours').value = "10.5";
    document.getElementById('ot-date').value = new Date().toISOString().split('T')[0];
    binaSemulaJadualDraf();
    tampilkanNotifikasi("Entri OT direkod ke draf.", "success");
};

window.padamDrafItem = function(idItem) {
    localOTDraft = localOTDraft.filter(item => item.id !== idItem);
    binaSemulaJadualDraf();
};

function binaSemulaJadualDraf() {
    const tBody = document.getElementById('ot-table-body');
    if (!tBody) return;
    tBody.innerHTML = "";
    
    if(localOTDraft.length === 0) {
        tBody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary py-4">No drafts added yet.</td></tr>`;
        return;
    }

    let t15=0, t20=0, t30=0, gt=0;
    localOTDraft.forEach((item, idx) => {
        if (item.gandaanRate === 1.5) t15 += item.jumlahJam;
        if (item.gandaanRate === 2.0) t20 += item.jumlahJam;
        if (item.gandaanRate === 3.0) t30 += item.jumlahJam;
        gt += item.bayaranHasil;

        tBody.innerHTML += `
            <tr>
                <td>${idx + 1}</td>
                <td class="text-secondary small">${item.tarikhKerja}</td>
                <td class="fw-semibold">${item.tugasan}</td>
                <td><span class="badge bg-secondary bg-opacity-50">${item.gandaanRate.toFixed(1)}x</span></td>
                <td>${item.jumlahJam.toFixed(1)}h</td>
                <td class="fw-bold text-success">RM ${item.bayaranHasil.toFixed(2)}</td>
                <td class="text-end"><button onclick="window.padamDrafItem(${item.id})" class="btn btn-sm btn-outline-danger border-0"><i class="fas fa-trash"></i></button></td>
            </tr>`;
    });

    const kadar = (globalBasicSalary / 26) / 8;
    document.getElementById('breakdown-1-5').innerText = `${t15.toFixed(1)}h`;
    document.getElementById('breakdown-2-0').innerText = `${t20.toFixed(1)}h`;
    document.getElementById('breakdown-3-0').innerText = `${t30.toFixed(1)}h`;
    document.getElementById('grand-total-val').innerText = `RM ${gt.toFixed(2)}`;
}

window.simpanKeCloud = async function() {
    if (localOTDraft.length === 0) return tampilkanNotifikasi("Tiada rekod draf.", "error");
    const btn = document.querySelector('.accent-cloud-btn');
    btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;

    try {
        const docRef = doc(db, "users_ot", currentUser.uid);
        const docSnap = await getDoc(docRef);
        let activeRecords = (docSnap.exists() && docSnap.data().activeRecords) ? docSnap.data().activeRecords : [];

        localOTDraft.forEach(item => {
            const parts = item.tarikhKerja.split('-');
            activeRecords.push({ otDate: `${parts[2]}/${parts[1]}/${parts[0]}`, taskName: item.tugasan, rateFactor: item.gandaanRate, hoursCount: item.jumlahJam });
        });

        await setDoc(docRef, { activeRecords, lastCommittedTime: serverTimestamp() }, { merge: true });
        tampilkanNotifikasi("Disinkronkan ke Cloud.", "success");
        localOTDraft = []; binaSemulaJadualDraf();
    } catch (e) { tampilkanNotifikasi("Ralat: " + e.message, "error"); }
    finally { btn.disabled = false; btn.innerHTML = `<i class="fas fa-cloud-upload-alt me-1"></i> Commit to Cloud`; }
};

function tampilkanNotifikasi(mesej, jenis = "success") {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `p-3 rounded-3 shadow-sm text-white animate-popup mb-2 d-flex align-items-center gap-2 ${jenis === 'success' ? 'bg-success' : 'bg-danger'}`;
    toast.innerHTML = `<i class="fas ${jenis === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${mesej}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    initPremiumUI();
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('ot-date')) document.getElementById('ot-date').value = today;
});