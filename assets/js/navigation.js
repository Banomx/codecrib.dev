document.addEventListener("DOMContentLoaded", function() {
    const navItems = [
        { name: "🏠 Dashboard", url: "index.html" },
        { name: "🚀 Software", url: "software.html" },
        { name: "📜 Snippets", url: "snippets.html" }
    ];

    const nav = document.createElement('nav');
    const currentPath = window.location.pathname.toLowerCase();

    navItems.forEach(item => {
        const link = document.createElement('a');
        link.href = item.url;
        link.textContent = item.name;
        
        // Check if the current path ends with the item URL or if it's the root matching index.html
        const isIndex = (item.url === 'index.html' && (currentPath === '/' || currentPath.endsWith('/index.html')));
        const isOther = currentPath.endsWith(item.url.toLowerCase());
        
        if (isIndex || isOther) link.classList.add('active');
        nav.appendChild(link);
    });
    document.body.prepend(nav);
});