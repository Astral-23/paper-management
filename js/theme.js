import { themeMenuButton, themeMenu, themeOptions, otherPage } from './dom.js';

// The renderOtherPage function will be passed during initialization
let renderOtherPageCallback = () => {};

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    themeOptions.forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === theme);
    });
    if (otherPage && !otherPage.classList.contains('hidden')) {
        renderOtherPageCallback();
    }
}

export function initializeTheme(renderOtherPageFunc) {
    if (renderOtherPageFunc) {
        renderOtherPageCallback = renderOtherPageFunc;
    }

    themeMenuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        themeMenu.classList.toggle('hidden');
    });

    themeOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.preventDefault();
            applyTheme(e.target.dataset.theme);
            themeMenu.classList.add('hidden');
        });
    });

    document.addEventListener('click', (e) => {
        if (!themeMenuButton.contains(e.target) && !themeMenu.contains(e.target)) {
            themeMenu.classList.add('hidden');
        }
    });

    applyTheme(localStorage.getItem('theme') || 'light');
}
