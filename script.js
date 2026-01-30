const STORE_KEY = 'taller_pro_v1';
let currentRepairId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Escuchar cambios de URL para el cliente
    window.addEventListener('hashchange', () => location.reload());

    const hash = window.location.hash;
    let dataParam = null;
    if (hash.includes('v=')) dataParam = hash.split('v=')[1];
    else if (hash.includes('status=')) dataParam = hash.split('status=')[1];

    if (dataParam) {
        try {
            const data = flexibleDecode(dataParam);
            renderClientView(data);
        } catch (e) {
            renderRepairs();
        }
    } else {
        renderRepairs();
    }

    // Asegurar que el formulario funcione siempre
    const form = document.getElementById('new-repair-form');
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            handleFormSubmit();
        };
    }
});

// --- BASE DE DATOS LOCAL ---
function getRepairs() {
    try {
        const d = localStorage.getItem(STORE_KEY);
        return d ? JSON.parse(d) : [];
    } catch (e) { return []; }
}
function saveRepairs(list) { localStorage.setItem(STORE_KEY, JSON.stringify(list)); }

// --- LOGICA DE REGISTRO ---
function handleFormSubmit() {
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const model = document.getElementById('deviceModel').value.trim();
    const cost = document.getElementById('estimatedCost').value;

    if (!name || !model) {
        alert("Completa nombre y modelo del equipo.");
        return;
    }

    const newEntry = {
        id: Date.now().toString(),
        clientName: name,
        clientPhone: phone,
        deviceModel: model,
        status: 'pending',
        estimatedCost: cost || ""
    };

    const repairs = getRepairs();
    repairs.unshift(newEntry);
    saveRepairs(repairs);

    document.getElementById('new-repair-form').reset();
    showView('dashboard');
    renderRepairs();
}

// --- PANEL DE CONTROL ---
function renderRepairs() {
    const repairs = getRepairs();
    const listEl = document.getElementById('repair-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (repairs.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color:#64748b; padding:2rem;">No hay ingresos todavía.</p>';
        return;
    }

    repairs.forEach(r => {
        const div = document.createElement('div');
        div.className = 'card-item';
        div.onclick = () => loadDetail(r.id);
        const costLabel = r.estimatedCost ? ` - $${r.estimatedCost}` : "";
        div.innerHTML = `
            <div class="card-info">
                <h3>${r.deviceModel}</h3>
                <p>${r.clientName}${costLabel}</p>
            </div>
            <span class="badge ${r.status}">${getStatusLabel(r.status)}</span>
        `;
        listEl.appendChild(div);
    });
}

function loadDetail(id) {
    currentRepairId = id;
    const r = getRepairs().find(item => item.id === id);
    if (!r) return;

    document.getElementById('detail-device').textContent = r.deviceModel;
    document.getElementById('detail-client').textContent = r.clientName;
    document.getElementById('detail-cost-input').value = r.estimatedCost || "";

    const badge = document.getElementById('detail-status');
    badge.textContent = getStatusLabel(r.status);
    badge.className = `badge ${r.status}`;

    updateShareLink(r);
    showView('detail');
}

function updatePrice() {
    const newPrice = document.getElementById('detail-cost-input').value;
    const list = getRepairs();
    const idx = list.findIndex(r => r.id === currentRepairId);
    if (idx !== -1) {
        list[idx].estimatedCost = newPrice;
        saveRepairs(list);
        updateShareLink(list[idx]);
        alert("Precio actualizado correctamente.");
    }
}

function updateStatus(newStatus) {
    const list = getRepairs();
    const idx = list.findIndex(r => r.id === currentRepairId);
    if (idx !== -1) {
        list[idx].status = newStatus;
        saveRepairs(list);
        loadDetail(currentRepairId);
    }
}

function updateShareLink(repair) {
    const link = window.location.href.split('#')[0] + '#v=' + safeEncode(repair);
    document.getElementById('share-link').textContent = link;
}

// --- VISTA CLIENTE ---
function renderClientView(data) {
    console.log('=== DATOS RECIBIDOS EN VISTA CLIENTE ===');
    console.log('Objeto completo:', data);
    console.log('Precio (estimatedCost):', data.estimatedCost);
    console.log('Tipo de dato del precio:', typeof data.estimatedCost);

    showView('client');
    document.getElementById('client-order-id').textContent = `ORDEN #${(data.id || "").slice(-6)}`;
    document.getElementById('client-device-model').textContent = data.deviceModel || "EQUIPO";
    document.getElementById('client-name-display').textContent = `CLIENTE: ${data.clientName || ""}`;

    const cost = data.estimatedCost;
    // Si no hay precio, mostramos el placeholder "$ -"
    const displayCost = (cost && cost !== "" && cost !== "0") ? `$ ${cost}` : "$ -";
    console.log('Precio que se mostrará:', displayCost);
    document.getElementById('client-cost').textContent = displayCost;

    const steps = [
        { k: 'pending', l: 'RECIBIDO' }, { k: 'working', l: 'EN REPARACION' },
        { k: 'waiting_parts', l: 'REPUESTOS' }, { k: 'ready', l: '¡LISTO PARA RETIRAR!' },
        { k: 'delivered', l: 'ENTREGADO' }
    ];

    const currentIdx = steps.findIndex(s => s.k === data.status);
    const container = document.getElementById('client-progress');
    if (container) {
        container.innerHTML = '';
        steps.forEach((s, i) => {
            const active = i <= currentIdx;
            const div = document.createElement('div');
            div.style.cssText = `margin-bottom:1.5rem; display:flex; align-items:center; gap:15px; opacity:${active ? '1' : '0.15'}`;
            div.innerHTML = `<i class="${active ? 'ph-fill ph-check-circle' : 'ph ph-circle'}" style="color:${active ? '#22c55e' : '#64748b'}; font-size:1.8rem;"></i> <span style="font-weight:bold; font-size:1.1rem;">${s.l}</span>`;
            container.appendChild(div);
        });
    }
}

// --- UTILIDADES DE CODIFICACION ---
function flexibleDecode(encoded) {
    let clean = encoded.trim().split('&')[0].replace(/ /g, '+');
    try {
        const bin = atob(clean);
        const decoded = decodeURIComponent(Array.prototype.map.call(bin, (c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(decoded);
    } catch (e) {
        return JSON.parse(atob(clean));
    }
}

function safeEncode(obj) {
    // Aseguramos que el precio (estimatedCost) se incluya aunque sea vacío
    const cleanObj = { ...obj };
    if (cleanObj.estimatedCost === undefined) cleanObj.estimatedCost = "";
    const str = JSON.stringify(cleanObj);
    return btoa(encodeURI(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode('0x' + p1);
    }));
}

function getStatusLabel(s) {
    const l = { pending: 'En Espera', working: 'En Taller', waiting_parts: 'Repuestos', ready: '¡LISTO!', delivered: 'Entregado' };
    return l[s] || s;
}

// --- COMPARTIR ---
function sendWhatsApp() {
    const link = document.getElementById('share-link').textContent;
    const r = getRepairs().find(i => i.id === currentRepairId);
    if (r) {
        const msg = `Hola ${r.clientName}, ya puedes ver el estado de tu ${r.deviceModel} aqui: ${link}`;
        window.open(`https://wa.me/${r.clientPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    }
}

// --- GENERADOR DE IMAGEN HD ---
function downloadStatusImage() {
    const r = getRepairs().find(i => i.id === currentRepairId);
    if (!r) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1000;  // Tamaño HD
    canvas.height = 1000; // Cuadrada para WhatsApp
    const ctx = canvas.getContext('2d');

    // Fondo Oscuro Premium
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1000, 1000);

    // Marco Verde Taller Pro
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 40;
    ctx.strokeRect(50, 50, 900, 900);

    // Texto Encabezado - Dividido en dos líneas para que se vea completo
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GOMERIA / LUBRICENTRO', 500, 110);
    ctx.fillText('TRES ISLETAS', 500, 155);

    ctx.font = 'bold 35px Arial';
    ctx.fillText('REPORTE DE ESTADO', 500, 200);

    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.fillText(`ORDEN #${r.id.slice(-6)}`, 500, 245);

    // Linea Divisoria
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(150, 290); ctx.lineTo(850, 290); ctx.stroke();

    // Equipo
    ctx.fillStyle = 'white';
    ctx.font = 'bold 80px Arial';
    ctx.fillText(r.deviceModel.toUpperCase(), 500, 400);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '40px Arial';
    ctx.fillText(`CLIENTE: ${r.clientName.toUpperCase()}`, 500, 470);

    // Caja de Estado
    ctx.fillStyle = '#1e293b';
    ctx.roundRect ? ctx.roundRect(150, 550, 700, 180, 20) : ctx.fillRect(150, 550, 700, 180);
    ctx.fill();

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 70px Arial';
    ctx.fillText(getStatusLabel(r.status).toUpperCase(), 500, 660);

    // Caja de Precio
    const precioTxt = r.estimatedCost ? `$${r.estimatedCost}` : "PENDIENTE";
    ctx.fillStyle = 'white';
    ctx.font = 'bold 50px Arial';
    ctx.fillText(`PRECIO: ${precioTxt}`, 500, 830);

    // Pie de imagen
    ctx.fillStyle = '#475569';
    ctx.font = '25px Arial';
    ctx.fillText('Gomeria / Lubricentro Tres Isletas', 500, 920);

    const dlink = document.createElement('a');
    dlink.download = `ORDEN_${r.id.slice(-6)}.png`;
    dlink.href = canvas.toDataURL('image/png');
    dlink.click();
}

function showView(viewName) {
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
    const v = document.getElementById(`view-${viewName}`);
    if (v) v.classList.remove('hidden');
    const h = document.querySelector('header');
    if (viewName === 'client') h.style.display = 'none';
    else h.style.display = 'flex';
}

function getStatusLabel(s) {
    const l = { pending: 'EN ESPERA', working: 'EN TALLER', waiting_parts: 'REPUESTOS', ready: '¡LISTO!', delivered: 'ENTREGADO' };
    return l[s] || s;
}

function deleteRepair() {
    if (!currentRepairId) return;
    // Eliminar sin confirmación y refrescar la lista inmediatamente
    const list = getRepairs().filter(i => i.id !== currentRepairId);
    saveRepairs(list);
    showView('dashboard');
    renderRepairs(); // actualizar la vista del dashboard al instante
}
