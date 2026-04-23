// IP Adresse abrufen

// Global variable to store all snippets
let allSnippets = [];
let allSoftware = [];

const DASHBOARD_CONFIG = {
    welcomeDelay: 1200,
    portTimeout: 1500,
    subnetTimeout: 400,
    refreshIntervals: {
        services: 300000, // 5 min
        latency: 10000    // 10 sec
    }
};

function initWelcomeScreen() {
    const overlay = document.getElementById('welcome-overlay');
    if (!overlay) return;

    setTimeout(() => {
        overlay.classList.add('hidden');
    }, DASHBOARD_CONFIG.welcomeDelay);
}

function setDynamicGreeting() {
    const greetingEl = document.getElementById('welcome-greeting');
    if (!greetingEl) return;

    const hour = new Date().getHours();
    let message = "Guten Morgen";
    if (hour >= 12 && hour < 18) message = "Guten Tag";
    else if (hour >= 18 || hour < 5) message = "Guten Abend";

    greetingEl.textContent = `${message}, Admin`;
}

function filterDashboard() {
    const term = document.getElementById('global-search')?.value.toLowerCase();
    if (!term) {
        document.querySelectorAll('.card').forEach(card => card.style.display = 'block');
        return;
    }
    document.querySelectorAll('.card').forEach(card => {
        const cardText = card.innerText.toLowerCase();
        const searchKeywords = card.dataset.searchKeywords ? card.dataset.searchKeywords.toLowerCase() : '';
        
        card.style.display = (cardText.includes(term) || searchKeywords.includes(term)) ? 'block' : 'none';
    });
}

function showNotification(message, duration = 2000) {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerText = message;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

async function fetchIP() {
    const el = document.getElementById('ip-display');
    const ispEl = document.getElementById('ip-isp');
    const locationEl = document.getElementById('ip-location');
    const securityEl = document.getElementById('ip-security');
    const privateEl = document.getElementById('ip-private');

    el.innerText = "Checking...";

    // Get Local IP via WebRTC (Async helper)
    const getLocalIP = new Promise(resolve => {
        const ips = new Set();
        const pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel("");
        pc.createOffer().then(o => pc.setLocalDescription(o)).catch(() => resolve([]));
        pc.onicecandidate = e => {
            if (!e || !e.candidate) { resolve(Array.from(ips)); pc.close(); return; }
            const match = e.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9\-]+\.local)/);
            if (match) ips.add(match[1]);
        };
        setTimeout(() => { resolve(Array.from(ips)); pc.close(); }, 1500);
    });

    try {
        // Fetch richer IP info and local IP in parallel
        const [pubRes, localIps] = await Promise.all([
            fetch('https://ipwho.is/').then(r => r.json()).catch(() => null),
            getLocalIP
        ]);

        if (privateEl) {
            privateEl.innerText = localIps.length > 0 ? localIps.join(', ') : 'N/A';
        }

        if (pubRes && pubRes.success) {
            el.innerText = pubRes.ip || "Error";
            if (ispEl) ispEl.innerText = pubRes.connection?.isp || pubRes.connection?.org || "Unknown";
            
            if (locationEl) {
                const city = pubRes.city || "";
                const country = pubRes.country || "";
                const flag = pubRes.flag?.emoji || "";
                locationEl.innerText = `${city}, ${country} ${flag}`.trim() || "Unknown";
            }

            if (securityEl) {
                const isVpn = pubRes.security?.vpn || pubRes.security?.proxy || pubRes.security?.tor;
                securityEl.innerText = isVpn ? "⚠️ Proxy/VPN detected" : "✅ Direct Connection";
                securityEl.style.color = isVpn ? "var(--warning)" : "var(--success)";
            }
        } else {
            // Fallback to ipify if the rich API fails
            const backup = await fetch('https://api.ipify.org?format=json').then(r => r.json()).catch(() => null);
            el.innerText = backup ? backup.ip : "Error";
            
            // Reset labels to avoid "Lade..." hang
            const fields = [ispEl, locationEl, securityEl, privateEl];
            fields.forEach(f => { if(f) f.innerText = "N/A (Error)"; });
            if (securityEl) securityEl.style.color = "var(--subtext)";
        }
    } catch (e) { 
        el.innerText = "Offline/Error"; 
        // Ensure "Lade..." is cleared even on catch
        const fields = [ispEl, locationEl, securityEl, privateEl];
        fields.forEach(f => { if(f && f.innerText === "Lade...") f.innerText = "Error"; });
    }
}

function openWhois() {
    const ipEl = document.getElementById('ip-display');
    const providerEl = document.getElementById('whois-provider');
    if (!ipEl || !providerEl) return;

    const ip = ipEl.innerText.trim();
    const provider = providerEl.value;

    // Check if the IP is loaded and valid (not placeholder or status message)
    const isValid = ip && !ip.includes('---') && !ip.includes('Checking') && !ip.includes('Error') && !ip.includes('Offline');

    if (isValid) {
        window.open(provider + ip, '_blank');
    } else {
        alert("Bitte warten Sie, bis die IP-Adresse geladen wurde oder prüfen Sie Ihre Verbindung.");
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
                <a href="${link.url}" target="_blank" class="dashboard-link-item" data-keywords="${link.desc}">
                    <div class="dashboard-link-header">
                        <span style="font-weight: 600;">${link.title}</span>
                        <span style="font-size: 0.7rem; opacity: 0.5;">↗</span>
                    </div>
                    <div class="dashboard-link-desc">${link.desc}</div>
                </a>
            `).join('');
        } 
        
        else if (type === 'software') {
            allSoftware = data.software;
            displaySoftware(allSoftware);

            const softwareSearch = document.getElementById('software-search');
            if (softwareSearch) {
                softwareSearch.addEventListener('input', filterSoftware);
            }
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
        const containers = {
            'dashboard': 'dashboard-links',
            'software': 'software-grid'
        };
        if (containers[type]) document.getElementById(containers[type]).innerHTML = `<p style="color: var(--danger); font-size: 0.8rem;">⚠️ Fehler beim Laden (JSON Error)</p>`;
    }
}

// Function to display software in the grid
function displaySoftware(categories) {
    const container = document.getElementById('software-grid');
    if (!container) return;
    
    container.innerHTML = categories.map(cat => {
        if (cat.items.length === 0) return '';
        return `
            <div class="card">
                <h2>${cat.category}</h2>
                <div class="btn-list">
                    ${cat.items.map(item => `
                        <div style="display: flex; gap: 8px; margin-bottom: 0.5rem; min-width: 0;">
                            <a href="${item.url}" target="_blank" style="flex: 1; margin-bottom: 0; min-width: 0;">
                                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                    <span>${item.name}</span>
                                    <span class="status-dot online" style="margin:0; width:6px; height:6px;" title="Available"></span>
                                </div>
                                <div style="font-size: 0.65rem; opacity: 0.6; margin-top: 4px;">OS: ${item.os}</div>
                            </a>
                            <button onclick="copyToClipboard('${item.url}', event)" class="copy-btn" title="Copy Link">📋</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// Function to filter software based on search
function filterSoftware() {
    const searchTerm = document.getElementById('software-search').value.toLowerCase();
    
    const filtered = allSoftware.map(cat => {
        const filteredItems = cat.items.filter(item => 
            item.name.toLowerCase().includes(searchTerm) || 
            item.os.toLowerCase().includes(searchTerm) ||
            cat.category.toLowerCase().includes(searchTerm)
        );
        return { ...cat, items: filteredItems };
    }).filter(cat => cat.items.length > 0);

    displaySoftware(filtered);
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

    // Render each category group (alphabetically sorted)
    Object.keys(groups).sort().forEach(category => {
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
        showNotification("In Zwischenablage kopiert! 📋");
        
        // Subtle visual feedback on the clicked element
        const el = event?.target;
        if (el) {
            el.style.transform = "scale(0.95)";
            setTimeout(() => el.style.transform = "", 100);
        }
    });
}

function exportScratchpad() {
    const text = document.getElementById('scratchpad').value;
    const blob = new Blob([text], { type: 'text/plain' });
    const anchor = document.createElement('a');
    anchor.download = `codecrib-notes-${new Date().toISOString().slice(0,10)}.txt`;
    anchor.href = window.URL.createObjectURL(blob);
    anchor.click();
    showNotification("Export erfolgreich! 💾");
}

function importScratchpad(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('scratchpad').value = e.target.result;
        localStorage.setItem('admin_notes', e.target.result);
        showNotification("Import abgeschlossen! 📥");
    };
    reader.readAsText(file);
}

function clearScratchpad() {
    if (confirm("Möchtest du das Scratchpad wirklich leeren?")) {
        const pad = document.getElementById('scratchpad');
        if (pad) {
            pad.value = '';
            localStorage.setItem('admin_notes', '');
        }
    }
}

async function fetchServiceStatus() {
    const progressContainer = document.getElementById('health-progress-container');
    const progressBar = document.getElementById('health-progress-bar');
    
    if (progressContainer) progressContainer.style.display = 'block';
    if (progressBar) progressBar.style.width = '5%';

    const services = [
        { id: 'github-status', url: 'https://www.githubstatus.com/api/v2/summary.json' },
        { id: 'cloudflare-status', url: 'https://www.cloudflarestatus.com/api/v2/summary.json' },
        { id: 'openai-status', url: 'https://status.openai.com/api/v2/summary.json' }
    ];

    let completed = 0;
    const total = services.length;

    for (const service of services) {
        const el = document.getElementById(service.id);
        if (!el) continue;

        try {
            const response = await fetch(service.url);
            const data = await response.json();
            const { indicator, description } = data.status;
            
            let statusClass = 'online';
            if (indicator === 'minor' || indicator === 'maintenance') statusClass = 'warning';
            if (indicator === 'major' || indicator === 'critical') statusClass = 'danger';

            let html = `<span><span class="status-dot ${statusClass}"></span>${description}</span>`;
            
            // Check for active incidents (Statuspage.io format)
            if (indicator !== 'none' && data.incidents && data.incidents.length > 0) {
                const activeIncident = data.incidents.find(inc => !['resolved', 'completed', 'postmortem'].includes(inc.status));
                if (activeIncident) {
                    html += `<div class="incident-title" title="${activeIncident.name}">${activeIncident.name}</div>`;
                }
            }

            // Check for active scheduled maintenances
            if (data.scheduled_maintenances && data.scheduled_maintenances.length > 0) {
                const activeMaintenance = data.scheduled_maintenances.find(
                    m => m.status === 'scheduled' || m.status === 'in_progress'
                );
                if (activeMaintenance) {
                    html += `<div class="incident-title" title="Maintenance: ${activeMaintenance.name}">Maintenance: ${activeMaintenance.name}</div>`;
                }
            }
            el.innerHTML = html;
        } catch (e) {
            console.error(`${service.id} check failed:`, e);
            // Keep original text if fetch fails (e.g. Azure/M365 which don't have easy CORS APIs)
            if (el.innerText.includes('Operational')) el.innerHTML = `<span class="status-dot warning"></span>Offline`;
        }
        
        completed++;
        if (progressBar) progressBar.style.width = `${(completed / total) * 100}%`;
    }

    const lastCheckEl = document.getElementById('last-service-check');
    if (lastCheckEl) {
        lastCheckEl.innerText = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    // Hide progress bar after a short delay
    setTimeout(() => {
        if (progressContainer) progressContainer.style.display = 'none';
        if (progressBar) progressBar.style.width = '0%';
    }, 800);
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
    
    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('global-search')?.focus();
        }
    });

    if (document.getElementById('current-time')) {
        initWelcomeScreen();
        setDynamicGreeting();
        updateClock();
        setInterval(updateClock, 1000);
        getBrowserInfo();
        fetchIP();
        fetchServiceStatus();
        setInterval(fetchServiceStatus, 300000); // 5 minute refresh
        setInterval(updateLatency, 10000); // 10 second latency check
        updateLatency();
    }
});

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    
    document.getElementById('current-time').textContent = timeStr;
    document.getElementById('current-date').textContent = dateStr;
}

async function updateBatteryStatus() {
    if (!navigator.getBattery) return;
    try {
        const battery = await navigator.getBattery();
        const updateInfo = () => {
            const level = Math.round(battery.level * 100);
            const charging = battery.charging ? " (Laden)" : "";
            const el = document.getElementById('battery-info');
            if (el) el.innerText = `${level}%${charging}`;
        };
        battery.addEventListener('levelchange', updateInfo);
        battery.addEventListener('chargingchange', updateInfo);
        updateInfo();
    } catch (e) { console.warn("Battery API restricted."); }
}

function getBrowserInfo() {
    const infoEl = document.getElementById('system-info');
    if (!infoEl) return;
    
    const os = navigator.platform;
    updateBatteryStatus();

    const userAgent = navigator.userAgent;

    // --- OS Detection ---
    let osName = "Unknown OS";
    let osVersion = "";
    
    // Try to get high-entropy values for specific Windows build (e.g., 24H2)
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        navigator.userAgentData.getHighEntropyValues(['platformVersion', 'architecture', 'model'])
            .then(ua => {
                if (ua.platform === "Windows") {
                    const majorVersion = parseInt(ua.platformVersion.split('.')[0]);
                    // Windows 11 usually reports platformVersion 13+ in this API
                    const friendlyVersion = majorVersion >= 13 ? "Windows 11" : "Windows 10";
                    const detailEl = document.getElementById('os-detail');
                    if (detailEl) detailEl.innerText = `${friendlyVersion} (Build ${ua.platformVersion})`;
                }
            });
    }

    if (userAgent.indexOf("Windows NT 10.0") != -1) {
        osName = "Windows 10/11";
        // More specific Windows versions (e.g., 24H2) are typically tied to build numbers.
        // Getting these reliably client-side from userAgent is difficult and often inaccurate.
        // navigator.userAgentData.platformVersion would be ideal but requires specific server-side Client Hints.
        // For now, we'll stick to a general Windows 10/11.
    } else if (userAgent.indexOf("Windows NT 6.3") != -1) osName = "Windows 8.1";
    else if (userAgent.indexOf("Windows NT 6.2") != -1) osName = "Windows 8";
    else if (userAgent.indexOf("Windows NT 6.1") != -1) osName = "Windows 7";
    else if (userAgent.indexOf("Mac") != -1) {
        osName = "macOS";
        const macVersionMatch = userAgent.match(/Mac OS X (\d+)_(\d+)_(\d+)/);
        if (macVersionMatch) {
            osVersion = `${macVersionMatch[1]}.${macVersionMatch[2]}.${macVersionMatch[3]}`;
        }
    } else if (userAgent.indexOf("Linux") != -1) osName = "Linux";
    else if (userAgent.indexOf("Android") != -1) osName = "Android";
    else if (userAgent.indexOf("iOS") != -1) osName = "iOS";

    // --- Browser Detection ---
    let browserName = "Unknown Browser";
    let browserVersion = "";
    let browserMatch;

    if ((browserMatch = userAgent.match(/(firefox)\/(\d+\.\d+)/i))) {
        browserName = "Firefox";
        browserVersion = browserMatch[2];
    } else if ((browserMatch = userAgent.match(/(chrome|crios)\/(\d+\.\d+)/i))) {
        browserName = "Chrome";
        browserVersion = browserMatch[2];
    } else if ((browserMatch = userAgent.match(/(safari)\/(\d+\.\d+)/i))) {
        browserName = "Safari";
        browserVersion = browserMatch[2];
    } else if ((browserMatch = userAgent.match(/(edge)\/(\d+\.\d+)/i))) {
        browserName = "Edge";
        browserVersion = browserMatch[2];
    } else if ((browserMatch = userAgent.match(/(msie|trident)\/(\d+\.\d+)/i))) {
        browserName = "IE";
        browserVersion = browserMatch[2];
    }

    // navigator.deviceMemory is an experimental API and often returns undefined or 0 for privacy reasons.
    // There is no reliable client-side way to get exact RAM.
    const memory = navigator.deviceMemory ? `${navigator.deviceMemory} GB (Estimate)` : 'N/A (Privacy/API limitation)';

    const screen = `${window.screen.width}x${window.screen.height}`;
    const lang = navigator.language;
    const cores = navigator.hardwareConcurrency || 'N/A';
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const onlineStatus = navigator.onLine ? 'Online' : 'Offline';
    
    infoEl.innerHTML = `
        <div class="status-item"><span>OS:</span> <span id="os-detail">${osName} ${osVersion}</span></div>
        <div class="status-item"><span>Browser:</span> <span>${browserName} ${browserVersion}</span></div>
        <div class="status-item"><span>Online Status:</span> <span>${onlineStatus}</span></div>
        <div class="status-item"><span>Resolution:</span> <span>${screen}</span></div>
        <div class="status-item"><span>Language:</span> <span>${lang}</span></div>
        <div class="status-item"><span>CPU Cores:</span> <span>${cores}</span></div>
        <div class="status-item"><span>Memory:</span> <span>~${memory}</span></div>
        <div class="status-item"><span>Battery:</span> <span id="battery-info">N/A</span></div>
        <div class="status-item"><span>Timezone:</span> <span>${tz}</span></div>
        <div class="status-item" style="font-size: 0.65rem; color: var(--subtext); word-break: break-all;"><span>User Agent:</span> <span title="${userAgent}">${userAgent}</span></div>
    `;
}

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

// Helper to convert IP to Long
function ipToLong(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

// Helper to convert Long to IP
function longToIp(long) {
    return [
        (long >>> 24) & 0xFF,
        (long >>> 16) & 0xFF,
        (long >>> 8) & 0xFF,
        long & 0xFF
    ].join('.');
}

// --- Subnetz Rechner (IPv4 Basis) ---
function calculateSubnet() {
    const ip = document.getElementById("sub-ip").value;
    const cidr = parseInt(document.getElementById("sub-cidr").value);
    const resDiv = document.getElementById("sub-result");
    const scanDiv = document.getElementById("subnet-scan-results");

    if (!ip || isNaN(cidr) || cidr < 0 || cidr > 32) {
        resDiv.innerHTML = "❌ Ungültige Eingabe";
        return;
    }
    
    if (scanDiv) scanDiv.style.display = 'none';

    const mask = (0xFFFFFFFF << (32 - cidr)) >>> 0;
    const ipLong = ipToLong(ip);
    const networkLong = (ipLong & mask) >>> 0;
    const broadcastLong = (networkLong | (~mask)) >>> 0;
    const hosts = Math.max(0, broadcastLong - networkLong - 1);

    resDiv.innerHTML = `
        <strong>Netz:</strong> ${longToIp(networkLong)}<br>
        <strong>Maske:</strong> ${longToIp(mask)}<br>
        <strong>Broadcast:</strong> ${longToIp(broadcastLong)}<br>
        <strong>Nutzbare Hosts:</strong> ${hosts.toLocaleString()}
    `;
}

// --- Subnet Web Scanner ---
async function scanSubnetForWeb() {
    const ip = document.getElementById("sub-ip").value;
    const cidr = parseInt(document.getElementById("sub-cidr").value);
    const resEl = document.getElementById("subnet-scan-results");
    
    if (!ip || isNaN(cidr) || cidr < 24) {
        alert("Definiere erst ein gültiges Subnetz im Subnetz-Check (min. /24).");
        return;
    }

    resEl.style.display = 'grid';
    resEl.innerHTML = '<div style="grid-column: 1/-1; font-size: 0.8rem; color: var(--accent); margin-bottom: 5px;">Web-Scan läuft für ' + ip + '/' + cidr + '...</div>';

    const mask = (0xFFFFFFFF << (32 - cidr)) >>> 0;
    const networkLong = (ipToLong(ip) & mask) >>> 0;
    const hostCount = Math.min(254, (0xFFFFFFFF >>> cidr) - 1);
    
    for (let i = 1; i <= hostCount; i++) {
        const targetIp = longToIp(networkLong + i);
        const dot = document.createElement('div');
        dot.className = 'scan-dot';
        dot.title = targetIp;
        
        const container = document.createElement('div');
        container.style.textAlign = 'center';
        container.innerHTML = `<div class="incident-title">.${i}</div>`;
        container.prepend(dot);
        resEl.appendChild(container);

        // Parallel check for port 80
        checkTarget(targetIp, 80).then(isOpen => {
            if (isOpen) {
                dot.style.background = 'var(--success)';
                dot.style.boxShadow = '0 0 5px var(--success)';
                dot.title = `${targetIp} - Webserver gefunden!`;
                // Add small success indicator to the summary
                document.getElementById('port-result').innerHTML = `<span style="color: var(--success)">Aktivität im Subnetz gefunden!</span>`;
            }
        });
    }
}

async function checkTarget(ip, port) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DASHBOARD_CONFIG.subnetTimeout); 
    try {
        // mode: no-cors is essential to bypass some browser security blocks during a 'ping' scan
        await fetch(`http://${ip}:${port}`, { mode: 'no-cors', signal: controller.signal });
        return true; 
    } catch (e) {
        // If it's a TypeError (reset) but NOT a timeout, the port is likely open
        return e.name !== 'AbortError';
    } finally {
        clearTimeout(timeout);
    }
}

// --- Latency Check ---
async function updateLatency() {
    const targets = [
        { id: 'ping-google', url: 'https://www.google.com/favicon.ico' },
        { id: 'ping-cloudflare', url: 'https://1.1.1.1/favicon.ico' }
    ];

    targets.forEach(async (target) => {
        const start = performance.now();
        try {
            // Use cache: 'no-store' to ensure we measure real transit time
            await fetch(target.url, { mode: 'no-cors', cache: 'no-store' });
            const duration = Math.round(performance.now() - start);
            document.querySelector(`#${target.id} .latency-value`).innerText = `${duration} ms`;
        } catch (e) {
            document.querySelector(`#${target.id} .latency-value`).innerText = `Error`;
        }
    });
}

async function fetchDNS() {
    const domain = document.getElementById('dns-query').value.trim();
    const type = document.getElementById('dns-type').value;
    const resEl = document.getElementById('dns-result');
    
    if (!domain) return;
    resEl.innerText = "Querying Cloudflare...";

    try {
        const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=${type}`, {
            headers: { 'accept': 'application/dns-json' }
        });
        const data = await response.json();
        if (data.Answer) {
            resEl.innerHTML = data.Answer.map(ans => `<div style="margin-bottom:4px;">• ${ans.data} <span style="font-size:0.6rem; color:var(--accent)">TTL: ${ans.TTL}</span></div>`).join('');
        } else {
            resEl.innerText = "No records found.";
        }
    } catch (e) {
        resEl.innerText = "Error: DoH lookup failed.";
    }
}

async function generateHash() {
    const input = document.getElementById('hash-input').value;
    const outputEl = document.getElementById('hash-output');
    if (!input) return;

    const msgUint8 = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    outputEl.innerText = hashHex;
    outputEl.style.color = "var(--accent)";
    showNotification("SHA-256 generiert!");
}

// --- Utility Handlers (Base64/URL) ---
function handleUtil(action) {
    const input = document.getElementById('util-input').value;
    const outputEl = document.getElementById('util-output');
    if (!input) return;

    try {
        let result = "";
        switch(action) {
            case 'b64-enc': result = btoa(input); break;
            case 'b64-dec': result = atob(input); break;
            case 'url-enc': result = encodeURIComponent(input); break;
            case 'url-dec': result = decodeURIComponent(input); break;
        }
        outputEl.innerText = result;
        outputEl.style.color = "var(--accent)";
    } catch (e) {
        outputEl.innerText = "❌ Fehler: Ungültiges Format";
        outputEl.style.color = "var(--danger)";
    }
}

// --- Port Checker ---
async function checkPort() {
    const host = document.getElementById('port-ip').value;
    const port = document.getElementById('port-num').value;
    const resEl = document.getElementById('port-result');

    if (!host || !port) {
        resEl.innerHTML = "❌ Bitte Host und Port angeben.";
        return;
    }

    // Restricted ports list (Browsers block these for security)
    const restricted = [21, 22, 23, 25, 110, 143, 465, 587, 993, 995];
    if (restricted.includes(parseInt(port))) {
        resEl.innerHTML = `<span style="color: var(--danger)">⚠️ Port ${port} wird vom Browser blockiert (Sicherheitsrisiko).</span>`;
        return;
    }

    resEl.innerHTML = '<span style="color: var(--accent)">Prüfe...</span>';
    
    // Check if we are on HTTPS and trying HTTP
    if (window.location.protocol === 'https:' && host !== 'localhost' && !host.startsWith('127.')) {
        resEl.innerHTML = `<span style="color: var(--warning)">⚠️ Browser-Block: HTTPS-Websites können keine lokalen HTTP-Ports scannen.</span>`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); 
    const start = performance.now();

    try {
        await fetch(`http://${host}:${port}`, { mode: 'no-cors', signal: controller.signal });
        resEl.innerHTML = `<span style="color: var(--success)">✅ Port ${port} ist OFFEN (Antwort erhalten).</span>`;
    } catch (err) {
        const duration = performance.now() - start;
        if (err.name === 'AbortError') {
            resEl.innerHTML = `<span style="color: var(--subtext)">❌ Port ${port} ist GESCHLOSSEN (Timeout).</span>`;
        } else {
            // If it failed fast, the connection was likely refused or 
            // reset, which often means the port is open but rejecting the HTTP request.
            if (duration < 100) {
                resEl.innerHTML = `<span style="color: var(--success)">✅ Port ${port} ist wahrscheinlich OFFEN (Connection Refused/Reset).</span>`;
            } else {
                resEl.innerHTML = `<span style="color: var(--danger)">❌ Port ${port} ist NICHT ERREICHBAR.</span>`;
            }
        }
    } finally {
        clearTimeout(timeoutId);
    }
}

// --- WebRTC Local Discovery ---
function scanLocalNetwork() {
    const el = document.getElementById('local-ip-list');
    if (!el) return;
    el.innerHTML = '<div style="color: var(--accent); font-size: 0.8rem;">Suche nach Schnittstellen...</div>';
    
    const ips = new Set();
    const pc = new RTCPeerConnection({ iceServers: [] });
    
    pc.createDataChannel("");
    pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => {});
    
    pc.onicecandidate = (event) => {
        if (!event || !event.candidate) return;
        
        const candidate = event.candidate.candidate;
        // Extracts IPv4 or mDNS .local hostnames
        const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9\-]+\.local)/;
        const match = candidate.match(ipRegex);
        
        if (match) {
            const found = match[1];
            if (!ips.has(found)) {
                ips.add(found);
                if (el.innerText.includes('Suche')) el.innerHTML = '';
                
                const isMdns = found.endsWith('.local');
                const item = document.createElement('div');
                item.className = 'status-item';
                item.style.fontSize = '0.85rem';
                item.innerHTML = `
                    <span>${isMdns ? 'Host (mDNS):' : 'Interface:'}</span> 
                    <span style="color: var(--accent)">${found}</span>
                `;
                el.appendChild(item);

                if (isMdns) {
                    el.innerHTML += '<p style="font-size: 0.65rem; color: var(--subtext); margin-top: 4px;">Info: Dein Browser maskiert die echte IP aus Datenschutzgründen (.local).</p>';
                }
            }
        }
    };

    setTimeout(() => {
        if (ips.size === 0 && el.innerText.includes('Suche')) {
            el.innerHTML = '<div style="color: var(--subtext); font-size: 0.75rem;">Keine IPs gefunden. Browser maskieren diese oft als .local Hostnames oder blockieren den Zugriff gänzlich.</div>';
        }
    }, 4000);
}

// --- Disclaimer Toggle ---
function toggleDisclaimer(element) {
    const disclaimerText = element.nextElementSibling; // The div with the disclaimer text
    const arrow = element.querySelector('.toggle-arrow');

    if (disclaimerText.classList.contains('expanded')) {
        disclaimerText.classList.remove('expanded');
        arrow.classList.remove('rotated');
    } else {
        disclaimerText.classList.add('expanded');
        arrow.classList.add('rotated');
    }
}

// --- Website Availability Checker ---
async function checkSiteStatus() {
    const urlInput = document.getElementById('site-url').value.trim();
    const resEl = document.getElementById('site-result');
    
    if (!urlInput) {
        resEl.innerHTML = "❌ Bitte URL eingeben.";
        return;
    }

    const url = urlInput.startsWith('http') ? urlInput : `https://${urlInput}`;
    resEl.innerHTML = '<span style="color: var(--accent)">Prüfe Erreichbarkeit...</span>';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        // We use mode: 'no-cors' to just check if the site is there at all
        const response = await fetch(url, { mode: 'no-cors', signal: controller.signal });
        resEl.innerHTML = `<span style="color: var(--success)">✅ Seite ist erreichbar!</span><br><span style="font-size: 0.7rem;">(Antwort erhalten via Browser-Fetch)</span>`;
    } catch (err) {
        if (err.name === 'AbortError') {
            resEl.innerHTML = `<span style="color: var(--danger)">❌ Timeout: Seite antwortet nicht.</span>`;
        } else {
            resEl.innerHTML = `<span style="color: var(--warning)">⚠️ Fehler: Verbindung fehlgeschlagen.</span><br><span style="font-size: 0.7rem;">Mögliche Ursache: DNS-Fehler oder restriktive CORS-Policy.</span>`;
        }
    } finally {
        clearTimeout(timeoutId);
    }
}