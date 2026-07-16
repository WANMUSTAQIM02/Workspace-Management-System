import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
let globalActiveRecords = [];
let recordToDeleteIndex = null;

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
// FETCH DATA
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
                
                document.getElementById('history-greeting').innerText = `Welcome back, ${data.nicknameProfile || 'User'}!`;
                document.getElementById('salary-indicator').innerText = `Hourly Rate: RM ${hourlyRate}`;
                
                globalActiveRecords = data.activeRecords || [];
                window.tapisSejarahOT(); // Render Table
                
                // Tambah animasi GSAP bila data masuk
                if (typeof gsap !== 'undefined') {
                    gsap.to(".gsap-element", { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power3.out" });
                }
            }
        } catch (error) {
            console.error(error);
            showPremiumToast("Error loading history logs.", "error");
        }
    } else {
        window.location.href = "login.html";
    }
});

// =========================================================================
// FILTER & RENDER LOGIC (FIXED OLD DATA & 15HB CUT-OFF PAYROLL)
// =========================================================================
window.tapisSejarahOT = function() {
    const tbody = document.getElementById('history-table-body');
    const filterMonth = document.getElementById('filter-month').value;
    const searchText = document.getElementById('search-task').value.toLowerCase();
    
    let filteredRecords = [];
    let totalHours = 0;
    let grandTotal = 0;
    let hourlyRate = basicSalary > 0 ? (basicSalary / 26 / 8) : 0;

    globalActiveRecords.forEach((row, index) => {
        let dateStr = row.otDate || row.date || "";
        
        // 1. Ekstrak Hari, Bulan dan Tahun (Support format '/' dan '-')
        let day = 0, month = 0, year = 0;
        if (dateStr.includes('/')) {
            let parts = dateStr.split('/');
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            year = parseInt(parts[2], 10);
        } else if (dateStr.includes('-')) {
            let parts = dateStr.split('-');
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            day = parseInt(parts[2], 10);
        }

        // 2. Logik Cut-Off 15hb (Jika lebih 15hb, ia masuk ke bulan depan)
        let targetPayrollMonth = month;
        if (day > 15) {
            targetPayrollMonth = month + 1;
            if (targetPayrollMonth > 12) {
                targetPayrollMonth = 1; // Kembali ke Januari tahun depan
            }
        }
        
        // Jadikan format 2 digit (cth: "08" untuk Ogos) supaya padan dengan dropdown
        let targetMonthStr = String(targetPayrollMonth).padStart(2, '0');

        // 3. Pengecaman Nama Task (Sapu bersih semua jenis variable lama kau)
        let taskName = row.taskDesc || row.taskAssigned || row.taskName || row.task || row.reason || "No Description";

        // Logik Penapis
        let monthMatch = (filterMonth === 'all') || (targetMonthStr === filterMonth);
        let searchMatch = taskName.toLowerCase().includes(searchText);

        if (monthMatch && searchMatch) {
            // Sapu bersih variable lama untuk hours dan rate juga
            let hours = parseFloat(row.hoursCount || row.hours) || 0;
            let rate = parseFloat(row.rateFactor || row.rate) || 1.5;
            let pay = hourlyRate * hours * rate;

            filteredRecords.push({
                originalIndex: index,
                date: dateStr,
                task: taskName,
                rate: rate,
                hours: hours,
                pay: pay
            });

            totalHours += hours;
            grandTotal += pay;
        }
    });

    // Kemaskini UI
    if (filteredRecords.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary py-4">No matching history logs found.</td></tr>`;
    } else {
        tbody.innerHTML = "";
        filteredRecords.forEach((item, i) => {
            let badgeColor = "bg-secondary";
            if (item.rate === 2.0) badgeColor = "bg-primary";
            if (item.rate === 3.0) badgeColor = "bg-danger"; 

            tbody.innerHTML += `
                <tr>
                    <td>${i + 1}</td>
                    <td class="text-secondary small">${item.date}</td>
                    <td class="fw-semibold">${item.task}</td>
                    <td><span class="badge ${badgeColor} bg-opacity-50">${item.rate.toFixed(1)}x</span></td>
                    <td>${item.hours.toFixed(1)}h</td>
                    <td class="text-success fw-bold">RM ${item.pay.toFixed(2)}</td>
                    <td class="text-end">
                        <button onclick="window.sahkanPadam(${item.originalIndex})" class="btn btn-sm btn-outline-danger border-0"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    }

    // Kemaskini Laporan Breakdown
    document.getElementById('report-total-hours').innerText = `${totalHours.toFixed(1)}h`;
    document.getElementById('report-total-tasks').innerText = `${filteredRecords.length} entries`;
    document.getElementById('report-grand-total').innerText = `RM ${grandTotal.toFixed(2)}`;
};

// =========================================================================
// DELETE RECORD LOGIC
// =========================================================================
window.sahkanPadam = function(index) {
    recordToDeleteIndex = index;
    const modal = new bootstrap.Modal(document.getElementById('custom-confirm-modal'));
    
    let taskName = globalActiveRecords[index].taskDesc || globalActiveRecords[index].taskAssigned || 'this task';
    document.getElementById('confirm-modal-body').innerText = `Are you sure you want to delete "${taskName}"?`;
    
    modal.show();

    document.getElementById('confirm-proceed-btn').onclick = async () => {
        modal.hide();
        if (recordToDeleteIndex === null || !currentUser) return;
        
        try {
            // Buang rekod dari senarai tempatan
            globalActiveRecords.splice(recordToDeleteIndex, 1);
            
            // Hantar senarai terbaru ke Firestore (Overwrite array lama)
            const userDocRef = doc(db, "users_ot", currentUser.uid);
            await updateDoc(userDocRef, {
                activeRecords: globalActiveRecords
            });
            
            showPremiumToast("Record deleted successfully.", "success");
            window.tapisSejarahOT(); // Refresh table
            recordToDeleteIndex = null;
        } catch (error) {
            console.error(error);
            showPremiumToast("Failed to delete record.", "error");
        }
    };
};

// =========================================================================
// EXPORT CSV LOGIC
// =========================================================================
window.eksportLaporan = function() {
    let csvContent = "data:text/csv;charset=utf-8,No,Date,Task,Rate,Hours,Pay (RM)\n";
    const tbody = document.getElementById('history-table-body');
    const rows = tbody.querySelectorAll('tr');
    
    if(rows.length === 0 || rows[0].innerText.includes("No matching")) {
        showPremiumToast("No data to export.", "warning");
        return;
    }

    rows.forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length > 1) {
            let rowData = Array.from(cols).slice(0, 6).map(col => `"${col.innerText.replace(/"/g, '""')}"`).join(",");
            csvContent += rowData + "\n";
        }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `WorkspacePro_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showPremiumToast("Exporting report...", "success");
};

// =========================================================================
// LOGOUT UTILITY
// =========================================================================
window.logKeluarSistem = async function() {
    try { 
        const { signOut } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
        await signOut(auth); 
        window.location.href = "login.html"; 
    } catch (error) { 
        console.error(error); 
        showPremiumToast("Logout failed.", "error");
    }
};