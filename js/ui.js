import { state, updateState } from './state.js';
import {
    papersContainer,
    emptyState,
    noteModal,
    noteModalTitle,
    noteEditor,
    notePreview,
    editModal,
    editTitleInput,
    editAuthorsInput,
    editUrlInput,
    editYearInput,
    editCitationsInput,
    editCategoryInput,
    editPaperForm,
    toast,
    filterAllBtn,
    filterReadBtn,
    filterUnreadBtn,
    filterToReadBtn,
    filterSkimmedBtn,
    categoryFilterSelect
} from './dom.js';
import { onAuthChange } from './firebase.js';

// `marked` is loaded globally in index.html.

function formatTimestamp(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== 'function') { return ''; }
    const date = timestamp.toDate();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function renderPapers() {
    updateCategoryFilterOptions();
    let filteredPapers = state.papers;
    if (state.currentStatusFilter !== 'all') filteredPapers = state.papers.filter(p => p.status === state.currentStatusFilter);
    if (state.currentCategoryFilter !== 'all') filteredPapers = filteredPapers.filter(p => (p.category || '未分類') === state.currentCategoryFilter);
    papersContainer.innerHTML = ''; 
    if (filteredPapers.length === 0 && !state.initialLoad) {
        emptyState.classList.remove('hidden'); papersContainer.appendChild(emptyState); return;
    }
    emptyState.classList.add('hidden');
    const groupedPapers = filteredPapers.reduce((acc, paper) => {
        const category = paper.category || '未分類'; if (!acc[category]) acc[category] = [];
        acc[category].push(paper); return acc;
    }, {});
    Object.keys(groupedPapers).sort().forEach(category => {
        const categoryHeading = document.createElement('h2'); categoryHeading.className = 'category-heading';
        categoryHeading.textContent = category; papersContainer.appendChild(categoryHeading);
        const categoryContainer = document.createElement('div'); categoryContainer.className = 'space-y-4';
        groupedPapers[category].forEach(paper => {
            const card = document.createElement('div');
            const statusClassMap = { read: 'is-read', skimmed: 'is-skimmed', 'to-read': 'is-to-read' };
            const statusClass = statusClassMap[paper.status] || '';
            card.className = `paper-card group p-4 rounded-xl transition-all duration-300 border ${statusClass ? statusClass : 'border-[var(--border-color)] bg-[var(--card-background)] hover:bg-[var(--card-hover-background)]'}`;
            if (!statusClass) card.style.background = 'var(--card-background)';
            const linkOrTitle = paper.url ? `<a href="${paper.url}" target="_blank" rel="noopener noreferrer" class="font-bold hover:underline">${paper.title}</a>` : `<span class="font-bold">${paper.title}</span>`;
            const authorsText = (paper.authors && paper.authors.length > 0) ? paper.authors.map(a => a.name).join(', ') : '著者不明';
            const noteHTML = paper.note ? marked.parse(paper.note) : '';
            const statusConfig = {
                'unread': { title: '「優先」に設定', color: 'text-[var(--muted-foreground)] hover:text-yellow-500'},
                'to-read': { title: '「流し読み」に設定', color: 'text-yellow-500 hover:text-sky-500'},
                'skimmed': { title: '「既読」に設定', color: 'text-sky-500 hover:text-green-500'},
                'read': { title: '「未読」に戻す', color: 'text-green-500 hover:text-[var(--muted-foreground)]'}
            };
            const currentStatus = paper.status || 'unread'; const config = statusConfig[currentStatus];
            const statusBtnHTML = `<button class="p-1.5 rounded-md ${config.color} hover:bg-black/5 dark:hover:bg-white/10" data-action="change-status" data-paper-id="${paper.id}" title="${config.title}"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg></button>`;
            card.innerHTML = `
                <div class="flex items-start justify-between relative">
                    <div class="flex-1 pr-4 min-w-0">
                        <div class="mb-1.5">${linkOrTitle}</div>
                        <p class="text-sm text-[--muted-foreground] truncate" title="${authorsText}">${authorsText}</p>
                        <div class="text-xs text-[--muted-foreground] mt-2 flex items-center flex-wrap gap-x-4 gap-y-1">
                            <span class="inline-flex items-center"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5 mr-1"><path fill-rule="evenodd" d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 12.5 2h-9ZM9.75 9.25a.75.75 0 0 0 0-1.5h-3.5a.75.75 0 0 0 0 1.5h3.5Z" clip-rule="evenodd" /></svg>${paper.year || 'N/A'}</span> 
                            <span class="inline-flex items-center"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5 mr-1"><path d="M2.5 3.5A1.5 1.5 0 0 1 4 2h3.25a.75.75 0 0 1 0 1.5H4a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5V8.75a.75.75 0 0 1 1.5 0V12a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 2.5 12v-8.5Z" /><path d="M7.25 5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V5.914l-4.72 4.72a.75.75 0 0 1-1.06-1.06L11.586 5H8a.75.75 0 0 1-.75-.75Z" /></svg>${paper.citationCount ?? 'N/A'}</span>
                            ${ (paper.status === 'read' && paper.readAt) ? `<span class="inline-flex items-center"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5 mr-1"><path fill-rule="evenodd" d="M14 2.5a.5.5 0 0 0-.5-.5h-11a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-11ZM3 4h10V3H3v1Zm0 1.5h10V13H3V5.5Z" clip-rule="evenodd" /></svg>${formatTimestamp(paper.readAt)}</span>` : ''}
                        </div>
                    </div>
                    <div class="admin-only absolute top-[-4px] right-[-4px] flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[var(--card-hover-background)] p-1 rounded-lg border border-[var(--border-color)]">
                        ${statusBtnHTML}
                        <button class="p-1.5 rounded-md text-[var(--muted-foreground)] hover:bg-black/5 dark:hover:bg-white/10 hover:text-blue-500" data-action="open-edit-modal" data-paper-id="${paper.id}" title="論文情報を編集"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" /><path fill-rule="evenodd" d="M3.5 17.5c0-1.036.84-1.875 1.875-1.875h10.375a1.875 1.875 0 010 3.75H5.375A1.875 1.875 0 013.5 17.5z" clip-rule="evenodd" /></svg></button>
                        <button class="p-1.5 rounded-md text-[var(--muted-foreground)] hover:bg-black/5 dark:hover:bg-white/10 hover:text-indigo-500" data-action="open-note-editor" data-paper-id="${paper.id}" title="メモを編集"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.75 5.25a.75.75 0 01.75-.75h11.5a.75.75 0 010 1.5H4.5a.75.75 0 01-.75-.75zm0 5a.75.75 0 01.75-.75h11.5a.75.75 0 010 1.5H4.5a.75.75 0 01-.75-.75zm0 5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75z" clip-rule="evenodd" /></svg></button>
                        <button class="p-1.5 rounded-md text-[var(--muted-foreground)] hover:bg-black/5 dark:hover:bg-white/10 hover:text-red-500" data-action="delete-paper" data-paper-id="${paper.id}" title="削除"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" /></svg></button>
                    </div>
                </div>
                ${noteHTML ? `<div class="mt-3 pt-3 border-t border-[var(--border-color)] text-sm prose prose-sm max-w-none">${noteHTML}</div>` : ''}
            `;
            categoryContainer.appendChild(card);
        });
        papersContainer.appendChild(categoryContainer);
    });

    onAuthChange(user => {
        const adminElements = document.querySelectorAll('.admin-only');
        const isVisible = !!user;
        adminElements.forEach(el => {
            if(el.tagName === 'ASIDE') { el.style.display = isVisible ? 'block' : 'none'; }
            else { el.style.display = isVisible ? 'flex' : 'none'; }
        });
    });
}

export function openNoteEditor(paperId) {
    updateState({ currentEditingPaperId: paperId });
    const paper = state.papers.find(p => p.id === paperId);
    if (!paper) return;
    noteModalTitle.textContent = `メモを編集: ${paper.title}`;
    noteEditor.value = paper.note || '';
    notePreview.innerHTML = marked.parse(paper.note || '');
    noteModal.classList.remove('hidden');
    noteModal.classList.add('flex');
}

export function closeNoteEditor() {
    noteModal.classList.add('hidden');
    noteModal.classList.remove('flex');
    updateState({ currentEditingPaperId: null });
}

export function openEditModal(paperId) {
    updateState({ currentEditingPaperId: paperId });
    const paper = state.papers.find(p => p.id === paperId);
    if (!paper) return;
    editTitleInput.value = paper.title || '';
    editAuthorsInput.value = (paper.authors && paper.authors.length > 0) ? paper.authors.map(a => a.name).join(', ') : '';
    editUrlInput.value = paper.url || '';
    editYearInput.value = paper.year || '';
    editCitationsInput.value = paper.citationCount ?? '';
    editCategoryInput.value = paper.category || '';
    editModal.classList.remove('hidden');
    editModal.classList.add('flex');
}

export function closeEditModal() {
    editModal.classList.add('hidden');
    editModal.classList.remove('flex');
    updateState({ currentEditingPaperId: null });
    editPaperForm.reset();
}

export function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast show ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
    setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3000);
}

export function updateFilterButtons() {
    const baseClass = 'filter-btn px-4 py-2 text-sm font-medium transition-colors focus:outline-none';
    const activeClass = 'bg-[var(--primary-color)] text-white';
    const inactiveClass = 'bg-[var(--card-background)] text-[var(--foreground)] hover:bg-[var(--card-hover-background)]';
    filterAllBtn.className = `${baseClass} rounded-l-md ${state.currentStatusFilter === 'all' ? activeClass : inactiveClass}`;
    filterToReadBtn.className = `${baseClass} border-l border-[var(--border-color)] ${state.currentStatusFilter === 'to-read' ? activeClass : inactiveClass}`;
    filterUnreadBtn.className = `${baseClass} border-l border-[var(--border-color)] ${state.currentStatusFilter === 'unread' ? activeClass : inactiveClass}`;
    filterSkimmedBtn.className = `${baseClass} border-l border-[var(--border-color)] ${state.currentStatusFilter === 'skimmed' ? activeClass : inactiveClass}`;
    filterReadBtn.className = `${baseClass} border-l border-[var(--border-color)] rounded-r-md ${state.currentStatusFilter === 'read' ? activeClass : inactiveClass}`;
}

export function updateCategoryFilterOptions() {
    const categories = [...new Set(state.papers.map(p => p.category).filter(Boolean))];
    const prevValue = categoryFilterSelect.value;
    categoryFilterSelect.innerHTML = '<option value="all">すべてのカテゴリ</option>';
    categories.sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilterSelect.appendChild(option);
    });
    if (categories.includes(prevValue)) {
        categoryFilterSelect.value = prevValue;
    }
}
