import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyAYQ9UKq6teDdfleoCfG_-kjiIf6Gj0DNc", authDomain: "ot-tracker-pro-64415.firebaseapp.com", projectId: "ot-tracker-pro-64415" };
const app = initializeApp(firebaseConfig); const db = getFirestore(app);

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

// LOGIK ASAL IDEA KAU (100% KEKAL)
onSnapshot(query(collection(db, "community_ideas"), orderBy("createdAt", "desc")), (snapshot) => {
    const container = document.getElementById('idea-container'); container.innerHTML = "";
    snapshot.forEach(doc => {
        const data = doc.data();
        container.innerHTML += `<div class="col-md-4 gsap-element"><div class="glass-panel p-4 h-100"><h5 class="fw-bold">${data.title}</h5><p class="text-secondary mt-3">${data.description}</p><small class="text-primary fw-bold">By: ${data.author}</small></div></div>`;
    });
});

window.hantarIdea = async function(event) {
    event.preventDefault();
    await addDoc(collection(db, "community_ideas"), { title: document.getElementById('idea-title').value, description: document.getElementById('idea-desc').value, author: "User", createdAt: serverTimestamp() });
    document.getElementById('idea-form').reset(); bootstrap.Modal.getInstance(document.getElementById('idea-modal')).hide();
};
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