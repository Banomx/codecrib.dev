document.addEventListener("DOMContentLoaded", function() {
    const navItems = [
        { name: "🏠 Dashboard", url: "index.html" },
        { name: "🚀 Software", url: "software.html" },
        { name: "📜 Snippets", url: "snippets.html" }
    ];

    const nav = document.createElement('nav');
    const path = window.location.pathname;
    const page = path.split("/").pop() || "index.html";

    navItems.forEach(item => {
        const link = document.createElement('a');
        link.href = item.url;
        link.textContent = item.name;
        if (page === item.url) link.classList.add('active');
        nav.appendChild(link);
    });

    document.body.prepend(nav);
});