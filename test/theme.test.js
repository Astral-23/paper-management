
import { describe, it, expect, beforeEach, vi } from 'vitest';

// `js/dom.js` をモックする
vi.mock('../js/dom.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        // テスト実行時にDOMから取得するようにする
        get themeMenuButton() { return document.getElementById('theme-menu-button'); },
        get themeMenu() { return document.getElementById('theme-menu'); },
        get themeOptions() { return document.querySelectorAll('[data-theme]'); },
        get otherPage() { return document.getElementById('other-page'); },
    };
});


beforeEach(() => {
    document.body.innerHTML = `
        <button id="theme-menu-button"></button>
        <div id="theme-menu" class="hidden">
            <a href="#" data-theme="light">Light</a>
            <a href="#" data-theme="dark">Dark</a>
            <a href="#" data-theme="sakura">Sakura</a>
        </div>
        <div id="other-page" class="hidden"></div>
    `;
    localStorage.clear();
    vi.resetModules();
});

describe('theme.js: 単体テスト', () => {

    it('initializeTheme: テーマメニューの表示・非表示が切り替わる', async () => {
        const { initializeTheme } = await import('../js/theme.js');
        const themeMenu = document.getElementById('theme-menu');
        const themeMenuButton = document.getElementById('theme-menu-button');
        initializeTheme();

        // 初期状態は非表示
        expect(themeMenu.classList.contains('hidden')).toBe(true);

        // ボタンクリックで表示
        themeMenuButton.click();
        expect(themeMenu.classList.contains('hidden')).toBe(false);

        // 再度ボタンクリックで非表示
        themeMenuButton.click();
        expect(themeMenu.classList.contains('hidden')).toBe(true);
    });

    it('initializeTheme: テーマを選択するとテーマが適用されメニューが閉じる', async () => {
        const { initializeTheme } = await import('../js/theme.js');
        const themeMenu = document.getElementById('theme-menu');
        const darkThemeOption = document.querySelector('[data-theme="dark"]');
        initializeTheme();

        // メニューを開く
        document.getElementById('theme-menu-button').click();
        expect(themeMenu.classList.contains('hidden')).toBe(false);

        // ダークテーマを選択
        darkThemeOption.click();

        // テーマが適用される
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(localStorage.getItem('theme')).toBe('dark');
        expect(darkThemeOption.classList.contains('active')).toBe(true);

        // メニューが閉じる
        expect(themeMenu.classList.contains('hidden')).toBe(true);
    });

    it('initializeTheme: メニュー外をクリックするとメニューが閉じる', async () => {
        const { initializeTheme } = await import('../js/theme.js');
        const themeMenu = document.getElementById('theme-menu');
        initializeTheme();

        // メニューを開く
        document.getElementById('theme-menu-button').click();
        expect(themeMenu.classList.contains('hidden')).toBe(false);

        // メニュー外（body）をクリック
        document.body.click();
        expect(themeMenu.classList.contains('hidden')).toBe(true);
    });

    it('initializeTheme: 初期読み込み時にlocalStorageのテーマを適用する', async () => {
        const { initializeTheme } = await import('../js/theme.js');
        localStorage.setItem('theme', 'sakura');
        initializeTheme();

        expect(document.documentElement.getAttribute('data-theme')).toBe('sakura');
        const sakuraThemeOption = document.querySelector('[data-theme="sakura"]');
        expect(sakuraThemeOption.classList.contains('active')).toBe(true);
    });

    it('initializeTheme: otherPageが表示されている時にテーマを変更するとコールバックが呼ばれる', async () => {
        const { initializeTheme } = await import('../js/theme.js');
        const renderOtherPageCallback = vi.fn();
        const otherPage = document.getElementById('other-page');
        otherPage.classList.remove('hidden');

        initializeTheme(renderOtherPageCallback);

        // テーマを変更
        const lightThemeOption = document.querySelector('[data-theme="light"]');
        lightThemeOption.click();

        expect(renderOtherPageCallback).toHaveBeenCalled();
    });
});
