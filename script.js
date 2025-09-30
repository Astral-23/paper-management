import { initializeTheme } from './js/theme.js';
import {
    loginBtn,
    logoutBtn,
    authModal,
    closeAuthModalBtn,
    loginForm,
    authErrorDiv,
    paperForm,
    addBtn,
    btnText,
    btnLoader,
    filterAllBtn,
    filterReadBtn,
    filterUnreadBtn,
    filterToReadBtn,
    filterSkimmedBtn,
    categoryFilterSelect,
    closeModalBtn,
    cancelNoteBtn,
    noteEditor,
    saveNoteBtn,
    paperTitleInput,
    autocompleteBtn,
    saveEditBtn,
    cancelEditBtn,
    closeEditModalBtn,
    showListBtn,
    showOtherBtn,
    listPage,
    otherPage,
    papersContainer,
    skeletonLoader,
    paperAuthorsInput,
    paperUrlDisplayInput,
    paperYearInput,
    paperCitationsInput,
    paperCategoryInput,
    paperNoteInput,
    notePreview,
    editTitleInput,
    editAuthorsInput,
    editUrlInput,
    editYearInput,
    editCitationsInput,
    editCategoryInput
} from './js/dom.js';
import {
    onAuthChange,
    startDataListening,
    signIn,
    signOut,
    deletePaper,
    changePaperStatus,
    addPaper,
    updatePaper,
    saveNote
} from './js/firebase.js';
import {
    fetchPaperDataByArxivId,
    searchAndFetchPaperDataByQuery,
    extractArxivId
} from './js/api.js';
import { state, updateState } from './js/state.js';
import { renderOtherPage } from './js/stats.js';
import {
    renderPapers,
    openNoteEditor,
    closeNoteEditor,
    openEditModal,
    closeEditModal,
    showToast,
    updateFilterButtons
} from './js/ui.js';

marked.use(markedKatex({ throwOnError: false }));

// --- Page Toggling ---
showListBtn.addEventListener('click', () => {
    listPage.classList.remove('hidden');
    otherPage.classList.add('hidden');
    showListBtn.classList.add('active');
    showOtherBtn.classList.remove('active');
});
showOtherBtn.addEventListener('click', () => {
    listPage.classList.add('hidden');
    otherPage.classList.remove('hidden');
    showListBtn.classList.remove('active');
    showOtherBtn.classList.add('active');
    renderOtherPage();
});

// --- Authentication ---
onAuthChange((user) => {
    const adminElements = document.querySelectorAll('.admin-only');
    if (user) {
        loginBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        adminElements.forEach(el => {
            if (el.tagName === 'ASIDE') { el.style.display = 'block'; }
            else { el.style.display = 'flex'; }
        });
    } else {
        loginBtn.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        adminElements.forEach(el => el.style.display = 'none');
    }
    renderPapers();
});

loginBtn.addEventListener('click', () => { authModal.classList.remove('hidden'); authModal.classList.add('flex'); });
closeAuthModalBtn.addEventListener('click', () => { authModal.classList.add('hidden'); authModal.classList.remove('flex'); });
logoutBtn.addEventListener('click', () => { signOut(); });

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm['email-address'].value;
    const password = loginForm['password'].value;
    try {
        await signIn(email, password);
        authErrorDiv.classList.add('hidden');
        closeAuthModalBtn.click();
    } catch (error) {
        console.error("Login failed:", error);
        authErrorDiv.textContent = 'メールアドレスまたはパスワードが間違っています。';
        authErrorDiv.classList.remove('hidden');
    }
});

// --- Paper Form & Autocomplete ---
autocompleteBtn.addEventListener('click', async () => {
    const query = paperTitleInput.value.trim();
    if (!query) {
        showToast('タイトルまたはURLを入力してください。', 'error');
        return;
    }
    let paperData = null;
    const arxivId = extractArxivId(query);
    if (arxivId) {
        paperData = await fetchPaperDataByArxivId(arxivId);
    } else {
        paperData = await searchAndFetchPaperDataByQuery(query);
    }
    if (paperData) {
        paperTitleInput.value = paperData.title || '';
        paperAuthorsInput.value = (paperData.authors && paperData.authors.length > 0) ? paperData.authors.map(a => a.name).join(', ') : '';
        paperUrlDisplayInput.value = paperData.url || '';
        paperYearInput.value = paperData.year || '';
        paperCitationsInput.value = paperData.citationCount ?? '';
        showToast('論文情報を補完しました。', 'success');
    } else {
        showToast('論文情報が見つかりませんでした。', 'error');
    }
});

paperForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    addBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    try {
        const title = paperTitleInput.value.trim();
        if (!title) throw new Error('タイトルは必須です。');
        const newPaperData = {
            title: title,
            authors: paperAuthorsInput.value.trim().split(',').filter(Boolean).map(name => ({ name: name.trim() })),
            url: paperUrlDisplayInput.value.trim() || null,
            year: paperYearInput.value.trim() ? parseInt(paperYearInput.value, 10) : null,
            citationCount: paperCitationsInput.value.trim() ? parseInt(paperCitationsInput.value, 10) : null,
            category: paperCategoryInput.value.trim(),
            note: paperNoteInput.value.trim(),
            status: 'unread',
            readAt: null
        };
        await addPaper(newPaperData);
        showToast('論文を追加しました', 'success');
        paperForm.reset();
    } catch (error) {
        showToast(error.message || '処理中にエラーが発生しました。', 'error');
        console.error("Error adding document:", error);
    } finally {
        addBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
    }
});

// --- Modals (Note & Edit) ---
noteEditor.addEventListener('input', () => { 
    notePreview.innerHTML = marked.parse(noteEditor.value); 
});

saveNoteBtn.addEventListener('click', async () => {
    if (!state.currentEditingPaperId) return;
    saveNoteBtn.disabled = true;
    try {
        await saveNote(state.currentEditingPaperId, noteEditor.value);
        showToast('メモを保存しました', 'success');
        closeNoteEditor();
    } catch (error) {
        showToast('保存に失敗しました', 'error');
    } finally {
        saveNoteBtn.disabled = false;
    }
});

closeModalBtn.addEventListener('click', closeNoteEditor);
cancelNoteBtn.addEventListener('click', closeNoteEditor);

saveEditBtn.addEventListener('click', async () => {
    if (!state.currentEditingPaperId) return;
    const updatedData = {
        title: editTitleInput.value.trim(),
        authors: editAuthorsInput.value.trim().split(',').filter(Boolean).map(name => ({ name: name.trim() })),
        url: editUrlInput.value.trim(),
        year: editYearInput.value.trim() ? parseInt(editYearInput.value, 10) : null,
        citationCount: editCitationsInput.value.trim() ? parseInt(editCitationsInput.value, 10) : null,
        category: editCategoryInput.value.trim()
    };
    if (!updatedData.title) {
        showToast('タイトルは必須です。', 'error');
        return;
    }
    saveEditBtn.disabled = true;
    try {
        await updatePaper(state.currentEditingPaperId, updatedData);
        showToast('論文情報を更新しました', 'success');
        closeEditModal();
    } catch (error) {
        console.error("Failed to update paper:", error);
        showToast('更新に失敗しました', 'error');
    } finally {
        saveEditBtn.disabled = false;
    }
});

cancelEditBtn.addEventListener('click', closeEditModal);
closeEditModalBtn.addEventListener('click', closeEditModal);

// --- Filters ---
filterAllBtn.addEventListener('click', () => { updateState({ currentStatusFilter: 'all' }); updateFilterButtons(); renderPapers(); });
filterReadBtn.addEventListener('click', () => { updateState({ currentStatusFilter: 'read' }); updateFilterButtons(); renderPapers(); });
filterUnreadBtn.addEventListener('click', () => { updateState({ currentStatusFilter: 'unread' }); updateFilterButtons(); renderPapers(); });
filterToReadBtn.addEventListener('click', () => { updateState({ currentStatusFilter: 'to-read' }); updateFilterButtons(); renderPapers(); });
filterSkimmedBtn.addEventListener('click', () => { updateState({ currentStatusFilter: 'skimmed' }); updateFilterButtons(); renderPapers(); });
categoryFilterSelect.addEventListener('change', (e) => { updateState({ currentCategoryFilter: e.target.value }); renderPapers(); });

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme(renderOtherPage);
    paperForm.reset();
    updateFilterButtons();
    startDataListening(
        () => { // onDataChange
            renderPapers();
            if (!otherPage.classList.contains('hidden')) {
                renderOtherPage();
            }
        },
        () => { // onError
            skeletonLoader.style.display = 'none';
            papersContainer.innerHTML = `<div class="text-center py-12"><h3 class="text-sm font-medium text-red-500">データの読み込みに失敗しました</h3></div>`;
        }
    );

    // Event Delegation for paper actions
    papersContainer.addEventListener('click', async (e) => {
        const target = e.target.closest('button[data-action]');
        if (!target) return;

        const { action, paperId } = target.dataset;

        switch (action) {
            case 'change-status':
                try {
                    await changePaperStatus(paperId);
                    showToast('ステータスを更新しました', 'success');
                } catch (err) {
                    console.error('ステータスの更新に失敗しました:', err);
                    showToast('ステータスの更新に失敗しました', 'error');
                }
                break;
            case 'open-edit-modal':
                openEditModal(paperId);
                break;
            case 'open-note-editor':
                openNoteEditor(paperId);
                break;
            case 'delete-paper':
                if (confirm('この論文を削除してもよろしいですか？')) {
                    try {
                        await deletePaper(paperId);
                        showToast('論文を削除しました', 'success');
                    } catch (err) {
                        console.error('削除に失敗しました:', err);
                        showToast('削除に失敗しました', 'error');
                    }
                }
                break;
        }
    });
});
