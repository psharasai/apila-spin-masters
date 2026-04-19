/* Theme toggle — apply saved preference before paint to prevent flash */
(function () {
    var saved = localStorage.getItem('tt-theme') || 'dark';
    document.documentElement.setAttribute('data-bs-theme', saved);

    document.addEventListener('DOMContentLoaded', function () {
        var btns = document.querySelectorAll('.theme-toggle-btn');
        if (!btns.length) return;

        function applyIcons(theme) {
            var icon = theme === 'dark' ? 'bi-sun-fill' : 'bi-moon-fill';
            var label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
            btns.forEach(function (b) {
                b.innerHTML = '<i class="bi ' + icon + '"></i>';
                b.setAttribute('aria-label', label);
            });
        }

        applyIcons(saved);

        btns.forEach(function (b) {
            b.addEventListener('click', function () {
                var current = document.documentElement.getAttribute('data-bs-theme');
                var next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-bs-theme', next);
                localStorage.setItem('tt-theme', next);
                applyIcons(next);
            });
        });
    });
})();
