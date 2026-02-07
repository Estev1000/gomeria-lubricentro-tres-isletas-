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



// --- COMPARTIR ---
function copyToClipboard() {
    const linkText = document.getElementById('share-link').textContent;
    navigator.clipboard.writeText(linkText).then(() => {
        alert('Enlace copiado al portapapeles');
    }).catch(err => {
        console.error('Error al copiar: ', err);
        // Fallback simple
        const textArea = document.createElement("textarea");
        textArea.value = linkText;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            alert('Enlace copiado al portapapeles');
        } catch (err) {
            console.error('No se pudo copiar', err);
        }
        document.body.removeChild(textArea);
    });
}

function sendWhatsApp() {
    const link = document.getElementById('share-link').textContent;
    const r = getRepairs().find(i => i.id === currentRepairId);
    if (r && r.clientPhone) {
        // Limpieza del número: quitar todo lo que no sea dígito
        let phone = r.clientPhone.replace(/[^0-9]/g, '');

        // Corrección inteligente para Argentina (Tres Isletas)
        // Si tiene 10 dígitos (ej. 3644xxxxxx), asumimos que falta 549
        if (phone.length === 10) {
            phone = '549' + phone;
        }
        // Si tiene 11 dígitos y arranca con 0 (ej. 03644xxxxxx), quitamos 0 y agregamos 549
        else if (phone.length === 11 && phone.startsWith('0')) {
            phone = '549' + phone.substring(1);
        }

        const msg = `Hola ${r.clientName}, ya puedes ver el estado de tu ${r.deviceModel} aqui: ${link}`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
        alert("Número de teléfono no disponible.");
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

    // Actualizar botones de navegación
    document.querySelectorAll('header nav button').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`nav-${viewName}`);
    if (activeBtn) activeBtn.classList.add('active');

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

// --- GESTIÓN DE DATOS (SEGURIDAD) ---
function exportJSON() {
    const data = getRepairs();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo_taller_pro_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportCSV() {
    const data = getRepairs();
    if (data.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    const headers = ["ID", "Cliente", "WhatsApp", "Equipo", "Estado", "Precio Estimado"];
    const rows = data.map(r => [
        r.id,
        r.clientName,
        r.clientPhone,
        r.deviceModel,
        getStatusLabel(r.status),
        r.estimatedCost
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM for Excel UTF-8
    csvContent += headers.join(";") + "\n";
    rows.forEach(row => {
        csvContent += row.map(field => `"${field}"`).join(";") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `taller_pro_excel_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                if (confirm(`Se importarán ${importedData.length} registros. ¿Deseas continuar?`)) {
                    saveRepairs(importedData);
                    alert("¡Datos restaurados con éxito!");
                    location.reload();
                }
            } else {
                alert("El archivo no tiene un formato válido.");
            }
        } catch (err) {
            alert("Error al leer el archivo. Asegúrate de que sea un archivo .json de respaldo.");
        }
    };
    reader.readAsText(file);
}
