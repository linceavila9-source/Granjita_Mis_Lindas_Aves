// --- INITIAL DATA STRUCTURE ---
const DEFAULT_STATE = {
    chickens: [
        {
            id: 1,
            name: "Pepito",
            avatar: "🐥",
            photoData: null,
            birthDate: "2026-10-26",
            feathers: "Amarillo",
            personality: "Pollito curioso y tierno.",
            favoriteTreat: "Gusanos de harina",
            healthStatus: "Excelente"
        }
    ],
    eggs: [
        { id: 101, chickenId: 1, date: "2026-10-26", count: 1, notes: "Ejemplo: cáscara firme, color crema" }
    ],
    health: [
        { id: 201, chickenId: 1, type: "Desparasitación", date: "2026-10-26", desc: "Ejemplo: pipeta antiparasitaria preventiva", nextDate: "2026-11-26" }
    ],
    diary: [
        { id: 301, chickenId: 1, title: "Ejemplo: Baño de tierra", date: "2026-10-26", story: "Pepito se revolcó en la tierra tibia del jardín y se quedó dormidito al sol. (Borra este ejemplo y escribe tus propios recuerdos.)" }
    ]
};

let appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
let eggChartInstance = null;

// Init on DOM ready
document.addEventListener("DOMContentLoaded", () => {
    loadFromLocalStorage();
    initDateFields();
    renderFlock();
    renderEggs();
    renderHealth();
    renderDiary();
    lucide.createIcons();
});

// --- LOCAL STORAGE PERSISTENCE ---
function saveToLocalStorage() {
    try {
        localStorage.setItem('coop_companion_app_v2', JSON.stringify(appState));
    } catch (e) {
        showToast("Memoria llena. Intenta comprimir las fotos.", "error");
    }
}

function loadFromLocalStorage() {
    const stored = localStorage.getItem('coop_companion_app_v2');
    if (stored) {
        try {
            appState = JSON.parse(stored);
            // Agregar ejemplos guía una sola vez si las secciones están vacías
            if (!appState.examplesAdded && appState.chickens.length === 1 && appState.chickens[0].name === "Pepito"
                && !(appState.eggs||[]).length && !(appState.health||[]).length && !(appState.diary||[]).length) {
                appState.eggs = JSON.parse(JSON.stringify(DEFAULT_STATE.eggs));
                appState.health = JSON.parse(JSON.stringify(DEFAULT_STATE.health));
                appState.diary = JSON.parse(JSON.stringify(DEFAULT_STATE.diary));
                appState.examplesAdded = true;
                saveToLocalStorage();
            }
            // Limpieza única de los ejemplos antiguos
            const demoNames = ["Margarita","Clara","Copito"];
            const demoChick = [1, 2, 3], demoOther = [101,102,103,104,105,201,202,301,302];
            const hadDemo = (appState.chickens || []).some(c => demoChick.includes(c.id) && demoNames.includes(c.name));
            if (hadDemo) {
                appState.chickens = appState.chickens.filter(c => !(demoChick.includes(c.id) && demoNames.includes(c.name)));
                ['eggs','health','diary'].forEach(k => appState[k] = (appState[k] || []).filter(x => !demoOther.includes(x.id)));
                if (appState.chickens.length === 0) { appState = JSON.parse(JSON.stringify(DEFAULT_STATE)); appState.examplesAdded = true; }
                saveToLocalStorage();
            }
        } catch (e) {
            console.error("Error al cargar localStorage:", e);
        }
    }
}

function initDateFields() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('eggDate').value = today;
    document.getElementById('healthDate').value = today;
    document.getElementById('diaryDate').value = today;
    document.getElementById('chickBirth').value = today;
}

// --- NAVIGATION CONTROLLER ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    
    // Desktop nav buttons
    document.querySelectorAll('.dt-nav-btn').forEach(btn => {
        btn.classList.remove('bg-amber-800/60', 'text-amber-100');
        btn.classList.add('text-amber-200');
    });
    const activeDtBtn = document.getElementById(`dt-nav-${tabId}`);
    if (activeDtBtn) activeDtBtn.classList.add('bg-amber-800/60', 'text-amber-100');

    // Mobile nav buttons
    document.querySelectorAll('.mb-nav-btn').forEach(btn => {
        btn.classList.remove('text-amber-100');
        btn.classList.add('text-amber-300/70');
    });
    const activeMbBtn = document.getElementById(`mb-nav-${tabId}`);
    if (activeMbBtn) activeMbBtn.classList.add('text-amber-100');

    // Show current section
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');

    if (tabId === 'eggs') {
        renderEggChart();
    } else if (tabId === 'sql') {
        runSQLPreset('SELECT_ALL');
    }
    lucide.createIcons();
}

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `p-3.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 pointer-events-auto transition-all transform translate-y-2 opacity-0 ${
        type === 'success' ? 'bg-emerald-900 text-emerald-100 border border-emerald-700' : 'bg-rose-900 text-rose-100 border border-rose-700'
    }`;
    toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" class="w-4 h-4"></i><span>${message}</span>`;
    
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

// --- IMAGE HANDLING & COMPRESSION (CANVAS) ---
function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Compress image using canvas
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 300;
            const MAX_HEIGHT = 300;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to lightweight base64 string
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            
            document.getElementById('chickPhotoData').value = compressedBase64;
            showImagePreview(compressedBase64);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function showImagePreview(base64Data) {
    const imgPreview = document.getElementById('avatarImagePreview');
    const emojiPreview = document.getElementById('avatarEmojiPreview');
    const removeBtn = document.getElementById('removePhotoButton');

    if (base64Data) {
        imgPreview.src = base64Data;
        imgPreview.classList.remove('hidden');
        emojiPreview.classList.add('hidden');
        removeBtn.classList.remove('hidden');
    } else {
        imgPreview.src = '';
        imgPreview.classList.add('hidden');
        emojiPreview.classList.remove('hidden');
        removeBtn.classList.add('hidden');
    }
}

function removePhoto() {
    document.getElementById('chickPhotoData').value = '';
    document.getElementById('chickPhotoInput').value = '';
    showImagePreview(null);
}

function updateEmojiPreview(emoji) {
    document.getElementById('avatarEmojiPreview').innerText = emoji;
}

// --- MODAL HELPERS ---
function openChickenModal(id = null) {
    const form = document.getElementById('chickenForm');
    form.reset();
    document.getElementById('chickPhotoData').value = '';
    showImagePreview(null);

    if (id) {
        const chick = appState.chickens.find(c => c.id === id);
        if (chick) {
            document.getElementById('chickenModalTitle').innerText = "Editar Ficha de " + chick.name;
            document.getElementById('chickId').value = chick.id;
            document.getElementById('chickName').value = chick.name;
            document.getElementById('chickAvatar').value = chick.avatar || '🐔';
            document.getElementById('avatarEmojiPreview').innerText = chick.avatar || '🐔';
            document.getElementById('chickBirth').value = chick.birthDate;
            document.getElementById('chickFeathers').value = chick.feathers;
            document.getElementById('chickPersonality').value = chick.personality;
            document.getElementById('chickTreat').value = chick.favoriteTreat;
            document.getElementById('chickHealthStatus').value = chick.healthStatus;

            if (chick.photoData) {
                document.getElementById('chickPhotoData').value = chick.photoData;
                showImagePreview(chick.photoData);
            }
        }
    } else {
        document.getElementById('chickenModalTitle').innerText = "Añadir Nueva Consentida";
        document.getElementById('chickId').value = "";
        document.getElementById('avatarEmojiPreview').innerText = "🐔";
    }
    document.getElementById('chickenModal').classList.remove('hidden');
}

function openEggModal() {
    populateChickenDropdowns();
    document.getElementById('eggModal').classList.remove('hidden');
}

function openHealthModal() {
    populateChickenDropdowns();
    document.getElementById('healthModal').classList.remove('hidden');
}

function openDiaryModal() {
    populateChickenDropdowns();
    document.getElementById('diaryModal').classList.remove('hidden');
}

function openBackupModal() {
    document.getElementById('backupModal').classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function populateChickenDropdowns() {
    const eggSelect = document.getElementById('eggChickenSelect');
    const healthSelect = document.getElementById('healthChickenSelect');
    const diarySelect = document.getElementById('diaryChickenSelect');

    const optionsHTML = appState.chickens.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    if (eggSelect) eggSelect.innerHTML = optionsHTML;
    if (healthSelect) healthSelect.innerHTML = optionsHTML;
    if (diarySelect) {
        diarySelect.innerHTML = `<option value="0">🌻 Toda la Manada</option>` + optionsHTML;
    }
}

// --- FLOCK MANAGEMENT ---
function renderFlock() {
    const container = document.getElementById('chickensGrid');
    if (appState.chickens.length === 0) {
        container.innerHTML = `
            <div class="col-span-full bg-white p-6 rounded-2xl text-center wood-border">
                <i data-lucide="egg" class="w-10 h-10 text-amber-400 mx-auto mb-2"></i>
                <p class="text-stone-600 font-semibold text-sm">No hay aves en la familia todavía.</p>
                <p class="text-xs text-stone-400 mt-1">Presiona "Añadir Nueva Ave" para registrar a tu primera consentida.</p>
            </div>`;
        return;
    }

    container.innerHTML = appState.chickens.map(chick => {
        const healthBadgeClass = chick.healthStatus === 'Excelente' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                chick.healthStatus === 'En Observación' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                'bg-rose-100 text-rose-800 border-rose-300';
        
        // Photo vs Emoji avatar rendering
        const avatarHTML = chick.photoData 
            ? `<img src="${chick.photoData}" class="w-14 h-14 rounded-2xl object-cover border-2 border-amber-300 shadow-sm" alt="${chick.name}">`
            : `<span class="text-3xl p-2 bg-amber-100/80 rounded-2xl border border-amber-200 flex items-center justify-center w-14 h-14">${chick.avatar || '🐔'}</span>`;

        return `
            <div class="bg-white rounded-2xl wood-border wood-card p-4 sm:p-5 relative flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex items-center gap-3">
                            ${avatarHTML}
                            <div>
                                <h3 class="font-bold text-base sm:text-lg text-amber-950">${chick.name}</h3>
                                <span class="text-[10px] font-medium px-2 py-0.5 rounded-full border ${healthBadgeClass}">
                                    ${chick.healthStatus}
                                </span>
                            </div>
                        </div>
                        <button onclick="openChickenModal(${chick.id})" class="text-stone-400 hover:text-amber-800 p-1 bg-amber-50 rounded-lg border border-amber-200">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                    </div>

                    <div class="space-y-1.5 text-xs text-stone-600 my-3 border-t border-b border-stone-100 py-2.5">
                        <div class="flex justify-between">
                            <span class="font-semibold text-stone-500">Plumaje:</span>
                            <span class="font-medium text-stone-800">${chick.feathers}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="font-semibold text-stone-500">Nacimiento:</span>
                            <span class="font-medium text-stone-800">${chick.birthDate}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="font-semibold text-stone-500">Snack Favorito:</span>
                            <span class="font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">${chick.favoriteTreat}</span>
                        </div>
                    </div>

                    <div>
                        <span class="text-[10px] uppercase tracking-wider text-stone-400 font-bold block mb-1">Personalidad:</span>
                        <p class="text-xs text-stone-700 italic bg-stone-50 p-2 rounded-xl border border-stone-100">
                            "${chick.personality}"
                        </p>
                    </div>
                </div>

                <div class="mt-4 pt-2.5 flex justify-between items-center text-[11px] text-stone-400 border-t border-stone-100">
                    <span>ID: <code class="font-mono text-stone-600">#${chick.id}</code></span>
                    <button onclick="deleteChicken(${chick.id})" class="text-rose-400 hover:text-rose-600 font-semibold">
                        Eliminar
                    </button>
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

function saveChicken(event) {
    event.preventDefault();
    const id = document.getElementById('chickId').value;
    const chickData = {
        id: id ? parseInt(id) : Date.now(),
        name: document.getElementById('chickName').value.trim(),
        avatar: document.getElementById('chickAvatar').value,
        photoData: document.getElementById('chickPhotoData').value || null,
        birthDate: document.getElementById('chickBirth').value,
        feathers: document.getElementById('chickFeathers').value.trim(),
        personality: document.getElementById('chickPersonality').value.trim(),
        favoriteTreat: document.getElementById('chickTreat').value.trim(),
        healthStatus: document.getElementById('chickHealthStatus').value
    };

    if (id) {
        const index = appState.chickens.findIndex(c => c.id === parseInt(id));
        if (index !== -1) appState.chickens[index] = chickData;
        showToast(`Se actualizó la ficha de ${chickData.name}`);
    } else {
        appState.chickens.push(chickData);
        showToast(`¡Bienvenida, ${chickData.name}! 🐣`);
    }

    saveToLocalStorage();
    renderFlock();
    closeModal('chickenModal');
}

function deleteChicken(id) {
    if (confirm("¿Deseas eliminar la ficha de esta ave?")) {
        appState.chickens = appState.chickens.filter(c => c.id !== id);
        saveToLocalStorage();
        renderFlock();
        showToast("Ficha eliminada", "error");
    }
}

// --- EGGS LOG & CHARTS ---
function renderEggs() {
    const tableBody = document.getElementById('eggLogsTableBody');
    
    if (appState.eggs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-stone-400">Sin registros de postura.</td></tr>`;
    } else {
        tableBody.innerHTML = [...appState.eggs].reverse().map(log => {
            const chicken = appState.chickens.find(c => c.id === log.chickenId) || { name: 'Desconocida' };
            const icon = chicken.photoData 
                ? `<img src="${chicken.photoData}" class="w-6 h-6 rounded-full object-cover">`
                : `<span>${chicken.avatar || '🐔'}</span>`;

            return `
                <tr class="hover:bg-amber-50/40 transition">
                    <td class="p-2.5 font-mono text-stone-600">${log.date}</td>
                    <td class="p-2.5 font-semibold text-stone-800 flex items-center gap-2">
                        ${icon}
                        <span>${chicken.name}</span>
                    </td>
                    <td class="p-2.5 font-bold text-amber-700">${log.count} huevo(s)</td>
                    <td class="p-2.5 text-stone-600">${log.notes || '-'}</td>
                    <td class="p-2.5 text-right">
                        <button onclick="deleteEggLog(${log.id})" class="text-stone-400 hover:text-rose-600">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Stats
    document.getElementById('statTotalEggs').innerText = appState.eggs.reduce((acc, curr) => acc + curr.count, 0);
    
    const henCounts = {};
    appState.eggs.forEach(e => {
        henCounts[e.chickenId] = (henCounts[e.chickenId] || 0) + e.count;
    });
    let topHenId = Object.keys(henCounts).reduce((a, b) => henCounts[a] > henCounts[b] ? a : b, null);
    if (topHenId) {
        const topHen = appState.chickens.find(c => c.id === parseInt(topHenId));
        document.getElementById('statTopHen').innerText = topHen ? topHen.name : '-';
    } else {
        document.getElementById('statTopHen').innerText = '-';
    }

    lucide.createIcons();
}

function saveEggLog(event) {
    event.preventDefault();
    const logData = {
        id: Date.now(),
        chickenId: parseInt(document.getElementById('eggChickenSelect').value),
        date: document.getElementById('eggDate').value,
        count: parseInt(document.getElementById('eggCount').value),
        notes: document.getElementById('eggNotes').value.trim()
    };

    appState.eggs.push(logData);
    saveToLocalStorage();
    renderEggs();
    renderEggChart();
    closeModal('eggModal');
    showToast("Huevito guardado 🥚");
}

function deleteEggLog(id) {
    appState.eggs = appState.eggs.filter(e => e.id !== id);
    saveToLocalStorage();
    renderEggs();
    renderEggChart();
    showToast("Registro eliminado", "error");
}

function renderEggChart() {
    const ctx = document.getElementById('eggChart');
    if (!ctx) return;

    const labelMap = {};
    appState.chickens.forEach(c => labelMap[c.id] = c.name);

    const totalsByChicken = {};
    appState.chickens.forEach(c => totalsByChicken[c.name] = 0);

    appState.eggs.forEach(e => {
        const name = labelMap[e.chickenId] || 'Otros';
        totalsByChicken[name] = (totalsByChicken[name] || 0) + e.count;
    });

    if (eggChartInstance) eggChartInstance.destroy();

    eggChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(totalsByChicken),
            datasets: [{
                label: 'Huevos Puestos',
                data: Object.values(totalsByChicken),
                backgroundColor: '#d2af79',
                borderColor: '#b17b43',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

// --- HEALTH MANAGEMENT ---
function renderHealth() {
    const tableBody = document.getElementById('healthLogsTableBody');
    const alertsContainer = document.getElementById('healthAlertsContainer');

    const todayStr = new Date().toISOString().split('T')[0];
    const upcoming = appState.health.filter(h => h.nextDate && h.nextDate >= todayStr);

    if (upcoming.length > 0) {
        alertsContainer.innerHTML = upcoming.map(h => {
            const chicken = appState.chickens.find(c => c.id === h.chickenId) || { name: 'Ave' };
            return `
                <div class="bg-amber-100 border-l-4 border-amber-600 p-3 rounded-r-xl flex items-center gap-2 text-amber-950 text-xs">
                    <i data-lucide="bell" class="w-4 h-4 text-amber-700 flex-shrink-0"></i>
                    <span><strong>Próximo Control:</strong> ${h.type} para <strong>${chicken.name}</strong> (${h.nextDate}).</span>
                </div>
            `;
        }).join('');
    } else {
        alertsContainer.innerHTML = `
            <div class="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
                <span>No hay alertas veterinarias pendientes.</span>
            </div>
        `;
    }

    if (appState.health.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-stone-400">Sin historial registrado.</td></tr>`;
    } else {
        tableBody.innerHTML = [...appState.health].reverse().map(h => {
            const chicken = appState.chickens.find(c => c.id === h.chickenId) || { name: 'Desconocida' };
            const icon = chicken.photoData 
                ? `<img src="${chicken.photoData}" class="w-6 h-6 rounded-full object-cover">`
                : `<span>${chicken.avatar || '🐔'}</span>`;

            return `
                <tr class="hover:bg-amber-50/40 transition">
                    <td class="p-2.5 font-mono text-stone-600">${h.date}</td>
                    <td class="p-2.5 font-semibold text-stone-800 flex items-center gap-2">
                        ${icon}
                        <span>${chicken.name}</span>
                    </td>
                    <td class="p-2.5"><span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 text-stone-700">${h.type}</span></td>
                    <td class="p-2.5 text-stone-800">${h.desc}</td>
                    <td class="p-2.5 font-mono text-amber-800 font-semibold">${h.nextDate || 'N/A'}</td>
                    <td class="p-2.5 text-right">
                        <button onclick="deleteHealthLog(${h.id})" class="text-stone-400 hover:text-rose-600">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    lucide.createIcons();
}

function saveHealthLog(event) {
    event.preventDefault();
    const logData = {
        id: Date.now(),
        chickenId: parseInt(document.getElementById('healthChickenSelect').value),
        type: document.getElementById('healthType').value,
        date: document.getElementById('healthDate').value,
        desc: document.getElementById('healthDesc').value.trim(),
        nextDate: document.getElementById('healthNextDate').value
    };

    appState.health.push(logData);
    saveToLocalStorage();
    renderHealth();
    closeModal('healthModal');
    showToast("Registro de salud guardado 🩺");
}

function deleteHealthLog(id) {
    appState.health = appState.health.filter(h => h.id !== id);
    saveToLocalStorage();
    renderHealth();
    showToast("Registro eliminado", "error");
}

// --- DIARY OF MEMORIES ---
function renderDiary() {
    const feed = document.getElementById('diaryFeed');
    if (appState.diary.length === 0) {
        feed.innerHTML = `
            <div class="bg-white p-6 rounded-2xl text-center wood-border">
                <i data-lucide="book-open" class="w-8 h-8 text-amber-400 mx-auto mb-2"></i>
                <p class="text-stone-600 font-semibold text-xs sm:text-sm">No hay anécdotas escritas aún.</p>
            </div>
        `;
        return;
    }

    feed.innerHTML = [...appState.diary].reverse().map(entry => {
        const chicken = appState.chickens.find(c => c.id === entry.chickenId);
        let tag = '🌻 Toda la Manada';
        let tagImage = '';

        if (chicken) {
            tag = chicken.name;
            tagImage = chicken.photoData 
                ? `<img src="${chicken.photoData}" class="w-5 h-5 rounded-full object-cover">` 
                : `<span>${chicken.avatar || '🐔'}</span>`;
        }

        return `
            <div class="bg-white rounded-2xl wood-border wood-card p-4 sm:p-5 relative space-y-2">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="text-[10px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full border border-amber-200 inline-flex items-center gap-1.5 mb-1">
                            ${tagImage} ${tag}
                        </span>
                        <h3 class="font-bold text-sm sm:text-base text-amber-950">${entry.title}</h3>
                    </div>
                    <span class="text-[10px] font-mono text-stone-400">${entry.date}</span>
                </div>
                <p class="text-xs sm:text-sm text-stone-700 leading-relaxed">${entry.story}</p>
                <div class="flex justify-end pt-2 border-t border-stone-100">
                    <button onclick="deleteDiaryEntry(${entry.id})" class="text-[11px] text-stone-400 hover:text-rose-600 flex items-center gap-1 font-semibold">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

function saveDiaryEntry(event) {
    event.preventDefault();
    const entryData = {
        id: Date.now(),
        chickenId: parseInt(document.getElementById('diaryChickenSelect').value),
        title: document.getElementById('diaryTitle').value.trim(),
        date: document.getElementById('diaryDate').value,
        story: document.getElementById('diaryContent').value.trim()
    };

    appState.diary.push(entryData);
    saveToLocalStorage();
    renderDiary();
    closeModal('diaryModal');
    showToast("Recuerdo guardado 📖");
}

function deleteDiaryEntry(id) {
    appState.diary = appState.diary.filter(d => d.id !== id);
    saveToLocalStorage();
    renderDiary();
    showToast("Anécdota eliminada", "error");
}

// --- BACKUP / RESTORE JSON ---
function exportJSONBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `CoopCompanion_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Copia de seguridad descargada 💾");
}

function importJSONBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData.chickens && importedData.eggs) {
                appState = importedData;
                saveToLocalStorage();
                renderFlock();
                renderEggs();
                renderHealth();
                renderDiary();
                closeModal('backupModal');
                showToast("¡Datos restaurados con éxito! 🎉");
            } else {
                alert("El archivo JSON no tiene la estructura válida de CoopCompanion.");
            }
        } catch (err) {
            alert("Error al leer el archivo de copia de seguridad.");
        }
    };
    reader.readAsText(file);
}

// --- SQL CONSOLE & EXPORT ---
function runSQLPreset(preset) {
    const textarea = document.getElementById('sqlQueryInput');
    if (preset === 'SELECT_ALL') {
        textarea.value = `SELECT id, nombre, raza_color, golosina_fav FROM Gallinas;`;
    } else if (preset === 'JOIN_HEALTH') {
        textarea.value = `SELECT G.nombre, S.tipo, S.descripcion, S.proxima_fecha\nFROM Gallinas G\nINNER JOIN Salud_Vacunas S ON G.id = S.gallina_id;`;
    } else if (preset === 'GROUP_EGGS') {
        textarea.value = `SELECT G.nombre, SUM(H.cantidad) AS total_huevos\nFROM Gallinas G\nLEFT JOIN Registro_Huevos H ON G.id = H.gallina_id\nGROUP BY G.id;`;
    }
    executeCustomSQL();
}

function executeCustomSQL() {
    const query = document.getElementById('sqlQueryInput').value.trim().toUpperCase();
    const outputArea = document.getElementById('sqlOutputArea');

    let columns = [];
    let rows = [];

    if (query.includes('FROM GALLINAS') && query.includes('INNER JOIN SALUD_VACUNAS')) {
        columns = ['nombre', 'tipo', 'descripcion', 'proxima_fecha'];
        rows = appState.health.map(h => {
            const c = appState.chickens.find(chk => chk.id === h.chickenId) || { name: 'Desconocida' };
            return [c.name, h.type, h.desc, h.nextDate || 'N/A'];
        });
    } else if (query.includes('GROUP BY') || (query.includes('FROM GALLINAS') && query.includes('REGISTRO_HUEVOS'))) {
        columns = ['nombre', 'total_huevos'];
        rows = appState.chickens.map(c => {
            const total = appState.eggs
                .filter(e => e.chickenId === c.id)
                .reduce((sum, e) => sum + e.count, 0);
            return [c.name, total];
        });
    } else if (query.includes('FROM GALLINAS')) {
        columns = ['id', 'nombre', 'raza_color', 'golosina_fav'];
        rows = appState.chickens.map(c => [c.id, c.name, c.feathers, c.favoriteTreat]);
    } else if (query.includes('FROM REGISTRO_HUEVOS')) {
        columns = ['id', 'gallina_id', 'fecha', 'cantidad'];
        rows = appState.eggs.map(e => [e.id, e.chickenId, e.date, e.count]);
    } else if (query.includes('FROM SALUD_VACUNAS')) {
        columns = ['id', 'gallina_id', 'tipo', 'descripcion', 'proxima_fecha'];
        rows = appState.health.map(h => [h.id, h.chickenId, h.type, h.desc, h.nextDate || 'N/A']);
    } else {
        columns = ['status', 'mensaje'];
        rows = [['OK', 'Consulta SQL ejecutada.']];
    }

    let tableHTML = `<table class="w-full text-left border-collapse border border-slate-800">
        <thead>
            <tr class="bg-slate-900 text-sky-300 border-b border-slate-800">
                ${columns.map(col => `<th class="p-2 border-r border-slate-800 font-mono">${col}</th>`).join('')}
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-800">`;

    if (rows.length === 0) {
        tableHTML += `<tr><td colspan="${columns.length}" class="p-2 text-slate-500 italic">0 filas devueltas.</td></tr>`;
    } else {
        rows.forEach(r => {
            tableHTML += `<tr class="hover:bg-slate-900/60">`;
            r.forEach(val => {
                tableHTML += `<td class="p-2 border-r border-slate-800 font-mono text-emerald-300">${val}</td>`;
            });
            tableHTML += `</tr>`;
        });
    }

    tableHTML += `</tbody></table>`;
    outputArea.innerHTML = tableHTML;
}

function exportSQLScript() {
    let sqlContent = `-- BASE DE DATOS COOPCOMPANION (.SQL EXPORT)\n\n`;
    sqlContent += `CREATE TABLE Gallinas (id INT PRIMARY KEY, nombre VARCHAR(100), raza_color VARCHAR(100), personalidad TEXT, golosina_fav VARCHAR(100));\n`;
    
    appState.chickens.forEach(c => {
        sqlContent += `INSERT INTO Gallinas VALUES (${c.id}, '${c.name}', '${c.feathers}', '${c.personality}', '${c.favoriteTreat}');\n`;
    });

    sqlContent += `\nCREATE TABLE Registro_Huevos (id INT PRIMARY KEY, gallina_id INT, fecha DATE, cantidad INT);\n`;
    appState.eggs.forEach(e => {
        sqlContent += `INSERT INTO Registro_Huevos VALUES (${e.id}, ${e.chickenId}, '${e.date}', ${e.count});\n`;
    });

    const dataStr = "data:text/sql;charset=utf-8," + encodeURIComponent(sqlContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `CoopCompanion_Database.sql`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Script .SQL descargado 🗄️");
}
