// IP Adresse abrufen
async function fetchIP() {
    const el = document.getElementById('ip-display');
    el.innerText = "Checking...";
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        el.innerText = data.ip;
    } catch (e) { 
        el.innerText = "Offline/Error"; 
    }
}

// JSON Daten laden und HTML generieren
async function loadLinks(type) {
    try {
        const response = await fetch('assets/data/links.json');
        const data = await response.json();

        if (type === 'dashboard') {
            const container = document.getElementById('dashboard-links');
            container.innerHTML = data.dashboard.map(link => `
                <a href="${link.url}" target="_blank" title="${link.desc}">
                    ${link.title} <span style="font-size: 0.7rem; float: right; opacity: 0.5;">↗</span>
                </a>
            `).join('');
        } 
        
        else if (type === 'software') {
            const container = document.getElementById('software-grid');
            container.innerHTML = data.software.map(cat => `
                <div class="card">
                    <h2>${cat.category}</h2>
                    <div class="btn-list">
                        ${cat.items.map(item => `
                            <a href="${item.url}" target="_blank">
                                ${item.name} <span class="tag ${item.os.toLowerCase()}">${item.os}</span>
                            </a>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error("Fehler beim Laden der JSON-Daten:", e);
    }
}

// Kopieren-Funktion für Snippets
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = event.target.innerText;
        event.target.innerText = "✅ Kopiert!";
        setTimeout(() => { event.target.innerText = originalText; }, 1500);
    });
}

// Scratchpad Initialisierung
document.addEventListener("DOMContentLoaded", () => {
    const pad = document.getElementById('scratchpad');
    if(pad) {
        pad.value = localStorage.getItem('admin_notes') || '';
        pad.addEventListener('input', () => {
            localStorage.setItem('admin_notes', pad.value);
        });
    }
});

// --- Passwort Generator ---
function generatePassword() {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~";
    let retVal = "";
    for (let i = 0; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    document.getElementById("pw-result").value = retVal;
}

// --- Subnetz Rechner (IPv4 Basis) ---
function calculateSubnet() {
    const ip = document.getElementById("sub-ip").value;
    const cidr = parseInt(document.getElementById("sub-cidr").value);
    const resDiv = document.getElementById("sub-result");

    if (!ip || isNaN(cidr) || cidr < 0 || cidr > 32) {
        resDiv.innerHTML = "❌ Ungültige Eingabe";
        return;
    }

    // Einfache Berechnung der Hosts
    const hosts = Math.pow(2, 32 - cidr) - 2;
    const mask = (0xFFFFFFFF << (32 - cidr)) >>> 0;
    const maskStr = [
        (mask >>> 24) & 0xFF,
        (mask >>> 16) & 0xFF,
        (mask >>> 8) & 0xFF,
        mask & 0xFF
    ].join('.');

    resDiv.innerHTML = `
        <strong>Maske:</strong> ${maskStr}<br>
        <strong>Nutzbare Hosts:</strong> ${hosts < 0 ? 0 : hosts.toLocaleString()}
    `;
}