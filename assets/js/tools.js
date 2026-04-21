// IP Adresse abrufen

// Global variable to store all snippets
let allSnippets = [];
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
        const fileName = type === 'snippets' ? 'snippets.json' : 'links.json';
        const response = await fetch(`assets/data/${fileName}`);
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

        else if (type === 'snippets') {
            allSnippets = data.snippets; // Store all snippets
            displaySnippets(allSnippets); // Display them initially
            
            // Attach event listener for search
            const searchInput = document.getElementById('snippet-search');
            if (searchInput) {
                searchInput.addEventListener('input', filterSnippets);
            }
        }
    } catch (e) {
        console.error("Fehler beim Laden der JSON-Daten:", e);
    }
}

// Function to display snippets in the grid
function displaySnippets(snippetsToDisplay) {
    const container = document.getElementById('snippets-grid');
    container.innerHTML = ''; // Clear previous content

    if (snippetsToDisplay.length === 0) {
        container.innerHTML = `<p style="color: var(--subtext); text-align: center; grid-column: 1 / -1;">No snippets found matching your search.</p>`;
        return;
    }

    // Group snippets by category
    const groups = snippetsToDisplay.reduce((acc, snippet) => {
        const cat = snippet.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(snippet);
        return acc;
    }, {});

    // Render each category group
    Object.keys(groups).forEach(category => {
        const header = document.createElement('h2');
        header.className = 'category-header';
        header.textContent = category;
        container.appendChild(header);

        groups[category].forEach(s => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `<h2>${s.title}</h2>`;
            const code = document.createElement('code');
            code.textContent = s.display;
            code.onclick = (event) => copyToClipboard(s.code, event);
            card.appendChild(code);
            container.appendChild(card);
        });
    });
}

// Function to filter snippets based on search input
function filterSnippets() {
    const searchTerm = document.getElementById('snippet-search').value.toLowerCase();
    const filtered = allSnippets.filter(s => 
        s.title.toLowerCase().includes(searchTerm) || 
        s.display.toLowerCase().includes(searchTerm) || 
        s.code.toLowerCase().includes(searchTerm) ||
        (s.category && s.category.toLowerCase().includes(searchTerm))
    );
    displaySnippets(filtered);
}

// Kopieren-Funktion für Snippets
function copyToClipboard(text, event) { // Accept event as argument
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        const targetElement = event ? event.target : null; // Use event.target if available
        if (targetElement) {
            const originalText = targetElement.innerText;
            const originalColor = targetElement.style.color;
            targetElement.innerText = "COPIED TO CLIPBOARD!";
            targetElement.style.color = "var(--success)";
            setTimeout(() => { 
                targetElement.innerText = originalText;
                targetElement.style.color = originalColor;
            }, 1500);
        } else {
            // Fallback for cases where event might not be passed (e.g., direct call)
            console.log("Copied: " + text);
        }
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
    // No need to call loadLinks here for snippets, it's called in snippets.html
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