import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { state, updateState } from '../js/state.js';

// Mock state.js
vi.mock('../js/state.js', () => {
  let state = {
    papers: [],
    currentStatusFilter: 'all',
    currentCategoryFilter: 'all',
    sortOrder: 'publicationYear',
    initialLoad: false,
    currentEditingPaperId: null,
  };
  return {
    state,
    updateState: vi.fn((newState) => {
      Object.assign(state, newState);
    }),
  };
});

// Mock firebase.js
vi.mock('../js/firebase.js', () => ({
  onAuthChange: vi.fn(),
}));

// Mock marked
global.marked = {
  parse: vi.fn(content => content || ''),
};

describe('ui.js', () => {
  let dom, uiModule;

  beforeEach(async () => {
    dom = new JSDOM(`
      <div id="papers-container"></div>
      <div id="empty-state" class="hidden"></div>
      <select id="category-filter"></select>
      <button id="filter-all"></button>
      <button id="filter-read"></button>
      <button id="filter-unread"></button>
      <button id="filter-to-read"></button>
      <button id="filter-skimmed"></button>
      <div id="note-modal" class="hidden">
        <h2 id="note-modal-title"></h2>
        <textarea id="note-editor"></textarea>
        <div id="note-preview"></div>
      </div>
      <div id="edit-modal" class="hidden">
        <form id="edit-paper-form">
          <input id="edit-title" />
          <input id="edit-authors" />
          <input id="edit-url" />
          <input id="edit-year" />
          <input id="edit-citations" />
          <input id="edit-category" />
        </form>
      </div>
      <div id="toast"></div>
    `);
    global.document = dom.window.document;
    vi.useFakeTimers();

    // Reset state before each test
    state.papers = [];
    state.currentStatusFilter = 'all';
    state.currentCategoryFilter = 'all';
    state.sortOrder = 'publicationYear';
    state.initialLoad = false;
    state.currentEditingPaperId = null;
    vi.clearAllMocks();

    // Dynamically import ui.js after setting up the DOM
    uiModule = await import('../js/ui.js');
  });

  afterEach(() => {
    vi.resetModules();
    vi.useRealTimers();
    global.document = undefined;
  });

  describe('renderPapers', () => {
    it('論文データが0件の場合、空の状態が表示される', () => {
      uiModule.renderPapers();
      const emptyState = document.getElementById('empty-state');
      expect(emptyState.classList.contains('hidden')).toBe(false);
    });

    it('論文データが存在する場合、論文カードが描画される', () => {
      state.papers = [{ id: '1', title: 'Paper 1' }];
      uiModule.renderPapers();
      const papersContainer = document.getElementById('papers-container');
      const paperCards = papersContainer.querySelectorAll('.paper-card');
      expect(paperCards.length).toBe(1);
      expect(papersContainer.textContent).toContain('Paper 1');
    });

    it('ステータスでフィルタリングされる', () => {
      state.papers = [
        { id: '1', title: 'Paper 1', status: 'read' },
        { id: '2', title: 'Paper 2', status: 'unread' },
      ];
      state.currentStatusFilter = 'read';
      uiModule.renderPapers();
      const paperCards = document.querySelectorAll('.paper-card');
      expect(paperCards.length).toBe(1);
      expect(document.getElementById('papers-container').textContent).toContain('Paper 1');
    });

    it('カテゴリでフィルタリングされる', () => {
      state.papers = [
        { id: '1', title: 'Paper 1', category: 'A' },
        { id: '2', title: 'Paper 2', category: 'B' },
      ];
      state.currentCategoryFilter = 'A';
      uiModule.renderPapers();
      const paperCards = document.querySelectorAll('.paper-card');
      expect(paperCards.length).toBe(1);
      expect(document.getElementById('papers-container').textContent).toContain('Paper 1');
    });

    it('発行年でソートされる', () => {
      state.papers = [
        { id: '1', title: 'Paper 2020', year: 2020 },
        { id: '2', title: 'Paper 2023', year: 2023 },
      ];
      state.sortOrder = 'publicationYear';
      uiModule.renderPapers();
      const paperCards = document.querySelectorAll('.paper-card');
      expect(paperCards[0].textContent).toContain('Paper 2023');
      expect(paperCards[1].textContent).toContain('Paper 2020');
    });
  });

  describe('updateFilterButtons', () => {
    it('currentStatusFilterがallの場合、"すべて"ボタンがアクティブになる', () => {
      state.currentStatusFilter = 'all';
      uiModule.updateFilterButtons();
      const filterAllBtn = document.getElementById('filter-all');
      expect(filterAllBtn.className).toContain('bg-[var(--primary-color)]');
    });

    it('currentStatusFilterがreadの場合、"既読"ボタンがアクティブになる', () => {
      state.currentStatusFilter = 'read';
      uiModule.updateFilterButtons();
      const filterReadBtn = document.getElementById('filter-read');
      expect(filterReadBtn.className).toContain('bg-[var(--primary-color)]');
    });
  });

  describe('Modals & Toast', () => {
    beforeEach(() => {
        state.papers = [
            { id: '1', title: 'Test Paper', note: 'Test note', authors: [{name: 'Auth1'}], url: 'http://a.com', year: 2023, citationCount: 10, category: 'A' },
        ];
    });

    it('openNoteEditorでメモ編集モーダルが開く', () => {
        uiModule.openNoteEditor('1');
        const noteModal = document.getElementById('note-modal');
        const noteModalTitle = document.getElementById('note-modal-title');
        const noteEditor = document.getElementById('note-editor');

        expect(noteModal.classList.contains('hidden')).toBe(false);
        expect(noteModalTitle.textContent).toContain('Test Paper');
        expect(noteEditor.value).toBe('Test note');
        expect(updateState).toHaveBeenCalledWith({ currentEditingPaperId: '1' });
    });

    it('closeNoteEditorでメモ編集モーダルが閉じる', () => {
        const noteModal = document.getElementById('note-modal');
        noteModal.classList.remove('hidden');
        uiModule.closeNoteEditor();
        expect(noteModal.classList.contains('hidden')).toBe(true);
        expect(updateState).toHaveBeenCalledWith({ currentEditingPaperId: null });
    });

    it('openEditModalで論文編集モーダルが開く', () => {
        uiModule.openEditModal('1');
        const editModal = document.getElementById('edit-modal');
        expect(editModal.classList.contains('hidden')).toBe(false);
        expect(document.getElementById('edit-title').value).toBe('Test Paper');
        expect(document.getElementById('edit-authors').value).toBe('Auth1');
        expect(updateState).toHaveBeenCalledWith({ currentEditingPaperId: '1' });
    });

    it('closeEditModalで論文編集モーダルが閉じる', () => {
        const editModal = document.getElementById('edit-modal');
        editModal.classList.remove('hidden');
        uiModule.closeEditModal();
        expect(editModal.classList.contains('hidden')).toBe(true);
        expect(updateState).toHaveBeenCalledWith({ currentEditingPaperId: null });
    });

    it('showToastでトーストが表示され、時間経過で消える', () => {
        const toast = document.getElementById('toast');
        uiModule.showToast('Test message');
        
        expect(toast.textContent).toBe('Test message');
        expect(toast.className).toContain('show');

        vi.advanceTimersByTime(3000);

        expect(toast.className).not.toContain('show');
    });
  });
});