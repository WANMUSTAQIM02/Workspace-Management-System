import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyAYQ9UKq6teDdfleoCfG_-kjiIf6Gj0DNc", authDomain: "ot-tracker-pro-64415.firebaseapp.com", projectId: "ot-tracker-pro-64415" };
const app = initializeApp(firebaseConfig); const auth = getAuth(app); const db = getFirestore(app);

let currentUser = null; let savedRecordsArchive = []; let userBasicSalary = 2500;

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
        gsap.to(".gsap-element", { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power3.out" });
    }
}

// LOGIK PENAPIS 15hb ASAL KAU
window.tapisSejarahOT = function() {
    const monthFilter = document.getElementById('filter-month').value; 
    const searchKeyword = document.getElementById('search-task').value.toLowerCase().trim();
    let filteredList = savedRecordsArchive;

    if (monthFilter !== 'all') {
        filteredList = filteredList.filter(row => {
            if (!row.otDate) return false;
            const parts = row.otDate.split('/'); const day = parseInt(parts[0], 10); const month = parseInt(parts[1], 10); 
            let targetPayrollMonth = month;
            if (day > 15) { targetPayrollMonth = month + 1; if (targetPayrollMonth > 12) targetPayrollMonth = 1; }
            return String(targetPayrollMonth).padStart(2, '0') === monthFilter;
        });
    }
    if (searchKeyword !== '') filteredList = filteredList.filter(row => row.taskName && row.taskName.toLowerCase().includes(searchKeyword));
    window.renderHistoryTable(filteredList);
};

window.renderHistoryTable = function(dataToRender) {
    const tableBody = document.getElementById('history-table-body'); if (!tableBody) return;
    tableBody.innerHTML = ''; let totalHours = 0; let grandTotalPay = 0; const hourlyRate = userBasicSalary / 26 / 8;
    if(document.getElementById('salary-indicator')) document.getElementById('salary-indicator').innerText = `Hourly Rate: RM ${hourlyRate.toFixed(2)}/hour`;

    if (!dataToRender || dataToRender.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary py-4">No matching history logs found.</td></tr>`;
        document.getElementById('report-total-hours').innerText = "0.0h"; document.getElementById('report-total-tasks').innerText = "0 entries"; document.getElementById('report-grand-total').innerText = "RM 0.00";
        return;
    }

    dataToRender.forEach((row, idx) => {
        const itemPay = hourlyRate * row.hoursCount * row.rateFactor; totalHours += row.hoursCount; grandTotalPay += itemPay;
        const originalIndex = savedRecordsArchive.indexOf(row);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${idx + 1}</td><td class="text-secondary">${row.otDate}</td><td class="fw-semibold">${row.taskName}</td><td><span class="badge bg-primary bg-opacity-25 text-primary">${row.rateFactor.toFixed(1)}x</span></td><td>${row.hoursCount.toFixed(1)}h</td><td class="text-success fw-bold">RM ${itemPay.toFixed(2)}</td><td class="text-end"><button onclick="window.padamRekodSahkan(${originalIndex})" class="btn btn-sm btn-outline-danger border-0"><i class="fas fa-trash"></i></button></td>`;
        tableBody.appendChild(tr);
    });

    document.getElementById('report-total-hours').innerText = `${totalHours.toFixed(1)}h`; document.getElementById('report-total-tasks').innerText = `${dataToRender.length} entries`; document.getElementById('report-grand-total').innerText = `RM ${grandTotalPay.toFixed(2)}`;
};

window.padamRekodSahkan = function(originalIndex) {
    if (originalIndex === -1 || originalIndex === undefined) return;
    const targetItem = savedRecordsArchive[originalIndex];
    const modalEl = document.getElementById('custom-confirm-modal'); const modal = new bootstrap.Modal(modalEl);
    document.getElementById('confirm-modal-body').innerHTML = `Are you sure you want to delete this record?<br><br>Date: <strong>${targetItem.otDate}</strong><br>Task: <strong>${targetItem.taskName}</strong>`;
    modal.show();

    document.getElementById('confirm-cancel-btn').onclick = () => modal.hide();
    document.getElementById('confirm-proceed-btn').onclick = async () => {
        modal.hide();
        try {
            savedRecordsArchive.splice(originalIndex, 1);
            await setDoc(doc(db, "users_ot", currentUser.uid), { activeRecords: savedRecordsArchive, lastCommittedTime: new Date().toISOString() }, { merge: true });
            window.tapisSejarahOT();
        } catch (error) { alert("Failed to delete: " + error.message); }
    };
};

window.eksportLaporan = function() { alert("Export Feature: Generating spreadsheet download link..."); };

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        try {
            const docSnap = await getDoc(doc(db, "users_ot", user.uid));
            if (docSnap.exists() && docSnap.data().basicSalaryProfile) {
                const cloudData = docSnap.data(); savedRecordsArchive = cloudData.activeRecords || []; userBasicSalary = parseFloat(cloudData.basicSalaryProfile) || 2500;
                if (document.getElementById('history-greeting')) document.getElementById('history-greeting').innerText = `Archived session for: ${cloudData.nickName || "User"}`;
            } else { window.location.href = "profile-settings.html"; return; }
        } catch (error) { console.error(error); }
        window.tapisSejarahOT();
    } else { window.location.href = "login.html"; }
});
document.addEventListener('DOMContentLoaded', initPremiumUI);

window.logKeluarSistem = async function() {
    try { 
        // Import module signOut secara dinamik untuk elak ralat jika tiada
        const { getAuth, signOut } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
        const auth = getAuth();
        await signOut(auth); 
        window.location.href = "login.html"; 
    } catch (e) { 
        console.error(e); 
    }
};