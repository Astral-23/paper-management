// --- テーマ切り替えロジック ---
const themeMenuButton = document.getElementById('theme-menu-button');
const themeMenu = document.getElementById('theme-menu');
const themeOptions = document.querySelectorAll('.theme-option');

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    themeOptions.forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === theme);
    });
    if (document.getElementById('other-page') && !document.getElementById('other-page').classList.contains('hidden')) {
        renderOtherPage();
    }
}

themeMenuButton.addEventListener('click', () => themeMenu.classList.toggle('hidden'));

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

// --- Firebase & App Logic ---
const auth = firebase.auth();
const db = firebase.firestore();

// Element Getters
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const authModal = document.getElementById('auth-modal');
const closeAuthModalBtn = document.getElementById('close-auth-modal-btn');
const loginForm = document.getElementById('login-form');
const authErrorDiv = document.getElementById('auth-error');
const paperForm = document.getElementById('paper-form');
const papersContainer = document.getElementById('papers-container');
const addBtn = document.getElementById('add-paper-btn');
const btnText = document.getElementById('btn-text');
const btnLoader = document.getElementById('btn-loader');
const toast = document.getElementById('toast');
const filterAllBtn = document.getElementById('filter-all');
const filterReadBtn = document.getElementById('filter-read');
const filterUnreadBtn = document.getElementById('filter-unread');
const filterToReadBtn = document.getElementById('filter-to-read');
const filterSkimmedBtn = document.getElementById('filter-skimmed');
const categoryFilterSelect = document.getElementById('category-filter');
const noteModal = document.getElementById('note-modal');
const noteModalTitle = document.getElementById('note-modal-title');
const closeModalBtn = document.getElementById('close-modal-btn');
const noteEditor = document.getElementById('note-editor');
const notePreview = document.getElementById('note-preview');
const cancelNoteBtn = document.getElementById('cancel-note-btn');
const saveNoteBtn = document.getElementById('save-note-btn');
const paperTitleInput = document.getElementById('paper-title');
const autocompleteBtn = document.getElementById('autocomplete-btn');
const paperAuthorsInput = document.getElementById('paper-authors');
const paperUrlDisplayInput = document.getElementById('paper-url-display');
const paperYearInput = document.getElementById('paper-year');
const paperCitationsInput = document.getElementById('paper-citations');
const paperCategoryInput = document.getElementById('paper-category');
const paperNoteInput = document.getElementById('paper-note');
const editModal = document.getElementById('edit-modal');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const editPaperForm = document.getElementById('edit-paper-form');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const editTitleInput = document.getElementById('edit-title');
const editAuthorsInput = document.getElementById('edit-authors');
const editUrlInput = document.getElementById('edit-url');
const editYearInput = document.getElementById('edit-year');
const editCitationsInput = document.getElementById('edit-citations');
const editCategoryInput = document.getElementById('edit-category');
const skeletonLoader = document.getElementById('skeleton-loader');
const emptyState = document.getElementById('empty-state');
const showListBtn = document.getElementById('show-list-btn');
const showOtherBtn = document.getElementById('show-other-btn');
const listPage = document.getElementById('list-page');
const otherPage = document.getElementById('other-page');

// App State
let currentEditingPaperId = null;
let papers = [];
let currentStatusFilter = 'all';
let currentCategoryFilter = 'all';
let initialLoad = true;
let charts = {}; // To hold chart instances
const STATUS_CYCLE = ['unread', 'to-read', 'skimmed', 'read'];

marked.use(markedKatex({ throwOnError: false }));

function renderOtherPage() {
    // New Features
    renderKeyAchievements();
    renderDetailedStats();
    
    // Existing Features
    renderContributionGraph();
    renderCategoryStats();
}

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

auth.onAuthStateChanged((user) => {
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
});

function startDataListening() {
    const q = db.collection('papers').orderBy("createdAt", "desc");
    q.onSnapshot((snapshot) => {
        if (initialLoad) {
            skeletonLoader.style.display = 'none';
            initialLoad = false;
        }
        papers = snapshot.docs.map(doc => {
            const data = doc.data();
            if (!data.status) {
                data.status = data.read ? 'read' : 'unread';
            }
            return { id: doc.id, ...data };
        });
        renderPapers();
        if (!otherPage.classList.contains('hidden')) {
            renderOtherPage();
        }
    }, (error) => {
        console.error("Error fetching papers: ", error);
        skeletonLoader.style.display = 'none';
        papersContainer.innerHTML = `<div class="text-center py-12"><h3 class="text-sm font-medium text-red-500">データの読み込みに失敗しました</h3></div>`;
    });
}

const ARXIV_ID_REGEX = /(\d{4}\.\d{4,5}(v\d+)?|[a-zA-Z-]+(?:\.[a-zA-Z-]+)?\/\d{7})/;

function formatTimestamp(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== 'function') { return ''; }
    const date = timestamp.toDate();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function fetchPaperDataByArxivId(paperId) {
    const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/ARXIV:${paperId}?fields=title,year,authors,citationCount,url`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch paper data by ArXiv ID:', error);
        return null;
    }
}

async function searchAndFetchPaperDataByQuery(query) {
    const searchApiUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=1&fields=title,year,authors,citationCount,url`;
    try {
        const response = await fetch(searchApiUrl);
        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        const result = await response.json();
        if (result.total > 0 && result.data.length > 0) { return result.data[0]; }
        return null;
    } catch (error) {
        console.error('Failed to search paper data:', error);
        return null;
    }
}

// --- ▼▼▼ NEW/MODIFIED FEATURE LOGIC ▼▼▼ ---

// 1. Key Achievements
function renderKeyAchievements() {
    const container = document.getElementById('key-achievements-container');
    if (!container) return;
    
    const readPapers = papers.filter(p => p.status === 'read' && p.readAt && p.readAt.toDate);
    
    // --- Max Streak Calculation ---
    let maxStreak = 0;
    if (readPapers.length > 0) {
        const readDates = [...new Set(readPapers.map(p => p.readAt.toDate().toISOString().split('T')[0]))].sort();
        if (readDates.length > 0) {
            let currentStreak = 1;
            maxStreak = 1;
            for (let i = 1; i < readDates.length; i++) {
                const prevDate = new Date(readDates[i-1]);
                const currentDate = new Date(readDates[i]);
                const diffTime = currentDate - prevDate;
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    currentStreak++;
                } else {
                    currentStreak = 1;
                }
                if (currentStreak > maxStreak) {
                    maxStreak = currentStreak;
                }
            }
        }
    }

    // --- Top Category Calculation ---
    let topCategory = { name: 'N/A', count: 0 };
    if (readPapers.length > 0) {
        const categoryCounts = readPapers.reduce((acc, p) => {
            const cat = p.category || '未分類';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {});
        for (const [name, count] of Object.entries(categoryCounts)) {
            if (count > topCategory.count) {
                topCategory = { name, count };
            }
        }
    }

    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-card-count">${maxStreak} <span class="text-lg font-medium">日</span></div>
            <div class="stat-card-label">最大読了ストリーク</div>
        </div>
        <div class="stat-card">
            <div class="stat-card-count">${topCategory.count} <span class="text-lg font-medium">本</span></div>
            <div class="stat-card-label">最多読了カテゴリ (${topCategory.name})</div>
        </div>
    `;
}


// 2. Detailed Stats (with Author Category)
function renderDetailedStats() {
    const readPapers = papers.filter(p => p.status === 'read' && p.readAt && p.readAt.toDate);
    const detailedStatsWrapper = document.getElementById('detailed-stats-wrapper');

    if (readPapers.length === 0) {
         detailedStatsWrapper.innerHTML = `<h3 class="text-xl font-bold mb-4">詳細な統計</h3><p class="text-center text-[var(--muted-foreground)]">統計を表示するには、既読の論文が1本以上必要です。</p>`;
         return;
    } else {
        detailedStatsWrapper.innerHTML = `
            <h3 class="text-xl font-bold mb-4">詳細な統計</h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="bg-[var(--card-background)] p-4 rounded-xl border border-[var(--border-color)]">
                     <h4 class="font-bold mb-2 text-center">月別読了論文数</h4>
                    <canvas id="monthly-reads-chart"></canvas>
                </div>
                <div class="bg-[var(--card-background)] p-4 rounded-xl border border-[var(--border-color)]">
                    <h4 class="font-bold mb-2 text-center">カテゴリ別読了数</h4>
                    <div class="max-w-xs mx-auto">
                       <canvas id="category-reads-chart"></canvas>
                    </div>
                </div>
                <div class="bg-[var(--card-background)] p-4 rounded-xl border border-[var(--border-color)]">
                     <h4 class="font-bold mb-2 text-center">発表年の分布</h4>
                    <canvas id="year-distribution-chart"></canvas>
                </div>
                <div class="bg-[var(--card-background)] p-4 rounded-xl border border-[var(--border-color)]">
                    <h4 class="font-bold mb-2 text-center">読了論文 著者ランキング Top 10</h4>
                    <div id="top-authors-container" class="space-y-2"></div>
                </div>
            </div>`;
    }

    Object.values(charts).forEach(chart => chart.destroy());
    
    const style = getComputedStyle(document.documentElement);
    const primaryColor = style.getPropertyValue('--primary-color').trim();
    const mutedColor = style.getPropertyValue('--muted-foreground').trim();
    const borderColor = style.getPropertyValue('--border-color').trim();
    
    // Monthly Reads
    const monthlyReads = {};
    for(let i=11; i>=0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyReads[key] = 0;
    }
    readPapers.forEach(p => {
        const d = p.readAt.toDate();
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if(monthlyReads.hasOwnProperty(key)) monthlyReads[key]++;
    });
    charts.monthly = new Chart(document.getElementById('monthly-reads-chart').getContext('2d'), {
        type: 'bar', data: { labels: Object.keys(monthlyReads), datasets: [{ label: '読了数', data: Object.values(monthlyReads), backgroundColor: primaryColor, borderRadius: 4 }] },
        options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });

    // Category Reads
    const categoryCounts = readPapers.reduce((acc, p) => {
        const cat = p.category || '未分類'; acc[cat] = (acc[cat] || 0) + 1; return acc; }, {});
    charts.category = new Chart(document.getElementById('category-reads-chart').getContext('2d'), {
        type: 'doughnut', data: { labels: Object.keys(categoryCounts), datasets: [{ data: Object.values(categoryCounts), backgroundColor: ['#4f46e5', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'], borderColor: style.getPropertyValue('--background').trim() }] }
    });

    // Year Distribution
    const yearCounts = readPapers.reduce((acc, p) => { if (p.year) { acc[p.year] = (acc[p.year] || 0) + 1; } return acc; }, {});
    const sortedYears = Object.keys(yearCounts).sort((a,b) => a - b);
    charts.year = new Chart(document.getElementById('year-distribution-chart').getContext('2d'), {
        type: 'bar', data: { labels: sortedYears, datasets: [{ label: '発表年', data: sortedYears.map(y => yearCounts[y]), backgroundColor: primaryColor }] },
        options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });

    // Top Authors with Category
    const authorData = {};
    readPapers.forEach(p => {
        const category = p.category || '未分類';
        if (p.authors) {
            p.authors.forEach(author => {
                if (!authorData[author.name]) {
                    authorData[author.name] = { count: 0, categories: {} };
                }
                authorData[author.name].count++;
                authorData[author.name].categories[category] = (authorData[author.name].categories[category] || 0) + 1;
            });
        }
    });
    const sortedAuthors = Object.entries(authorData).sort(([,a],[,b]) => b.count-a.count).slice(0, 10);
    
    const topAuthorsContainer = document.getElementById('top-authors-container');
    topAuthorsContainer.innerHTML = sortedAuthors.map(([name, data], index) => {
        const topCategory = Object.entries(data.categories).sort(([,a],[,b]) => b-a)[0][0];
        return `
            <div class="flex justify-between items-center py-1.5 border-b border-[var(--border-color)]">
                <div>
                    <p class="font-semibold">${index + 1}. ${name}</p>
                    <p class="text-xs text-[var(--muted-foreground)]">${topCategory}</p>
                </div>
                <span class="font-bold text-lg text-[var(--primary-color)]">${data.count}</span>
            </div>`;
    }).join('') || `<p class="text-center text-[var(--muted-foreground)]">データがありません。</p>`;
}


// --- ▲▲▲ NEW/MODIFIED FEATURE LOGIC ▲▲▲ ---


function renderCategoryStats() {
    const container = document.getElementById('category-stats-container');
    if (!container) return;
    container.innerHTML = '';
    const readPapers = papers.filter(p => p.status === 'read');
    if (readPapers.length === 0) {
        container.innerHTML = `<p class="text-[var(--muted-foreground)] col-span-full text-center">まだ既読の論文はありません。</p>`;
        return;
    }
    const categoryCounts = {}; let totalCount = 0;
    readPapers.forEach(p => {
        const category = p.category || '未分類';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1; totalCount++;
    });
    const totalCard = document.createElement('div');
    totalCard.className = 'stat-card';
    totalCard.innerHTML = `<div class="stat-card-count">${totalCount}</div><div class="stat-card-label">合計</div>`;
    container.appendChild(totalCard);
    Object.keys(categoryCounts).sort().forEach(category => {
        const count = categoryCounts[category]; const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `<div class="stat-card-count">${count}</div><div class="stat-card-label">${category}</div>`;
        container.appendChild(card);
    });
}

function renderContributionGraph() {
    const monthsContainer = document.getElementById('graph-months');
    const daysContainer = document.getElementById('graph-days');
    const gridContainer = document.getElementById('graph-grid');
    if (!monthsContainer || !daysContainer || !gridContainer) return;

    monthsContainer.innerHTML = ''; daysContainer.innerHTML = ''; gridContainer.innerHTML = '';
    
    ['日', '月', '火', '水', '木', '金', '土'].forEach((day, i) => {
        const span = document.createElement('span'); if (i % 2 !== 0) span.textContent = day;
        daysContainer.appendChild(span);
    });

    const readCounts = {};
    papers.filter(p => p.status === 'read' && p.readAt && typeof p.readAt.toDate === 'function').forEach(p => {
        const date = p.readAt.toDate();
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        readCounts[dateString] = (readCounts[dateString] || 0) + 1;
    });

    const today = new Date(); let currentDate = new Date();
    currentDate.setFullYear(today.getFullYear() - 1); currentDate.setDate(today.getDate() + 1);
    currentDate.setDate(currentDate.getDate() - currentDate.getDay());
    
    let lastMonth = -1; const blockWidth = 16; const gap = 4; let weekIndex = 0;

    for (let i = 0; i < 371; i++) {
        const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        const currentMonth = currentDate.getMonth();
        if (currentDate.getDate() === 1 && currentMonth !== lastMonth) {
            lastMonth = currentMonth;
            const monthLabel = document.createElement('span'); monthLabel.textContent = `${currentMonth + 1}月`;
            monthLabel.className = 'absolute'; monthLabel.style.left = `${weekIndex * (blockWidth + gap)}px`;
            monthsContainer.appendChild(monthLabel);
        }

        const dayBlock = document.createElement('div');
        if (currentDate <= today) {
            const count = readCounts[dateString] || 0; dayBlock.className = 'graph-day';
            dayBlock.dataset.date = dateString;
            if (count > 0) dayBlock.classList.add('level-4');
            dayBlock.title = `${dateString}: ${count}件の論文を読了`;
        } else {
            dayBlock.style.visibility = 'hidden';
        }
        gridContainer.appendChild(dayBlock);
        currentDate.setDate(currentDate.getDate() + 1);
        if (currentDate.getDay() === 0) weekIndex++;
    }
}

function renderPapers() {
    updateCategoryFilterOptions();
    let filteredPapers = papers;
    if (currentStatusFilter !== 'all') filteredPapers = papers.filter(p => p.status === currentStatusFilter);
    if (currentCategoryFilter !== 'all') filteredPapers = filteredPapers.filter(p => (p.category || '未分類') === currentCategoryFilter);
    papersContainer.innerHTML = ''; 
    if (filteredPapers.length === 0 && !initialLoad) {
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
            const statusBtnHTML = `<button class="p-1.5 rounded-md ${config.color} hover:bg-black/5 dark:hover:bg-white/10" onclick="window.changePaperStatus('${paper.id}')" title="${config.title}"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg></button>`;
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
                        <button class="p-1.5 rounded-md text-[var(--muted-foreground)] hover:bg-black/5 dark:hover:bg-white/10 hover:text-blue-500" onclick="window.openEditModal('${paper.id}')" title="論文情報を編集"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" /><path fill-rule="evenodd" d="M3.5 17.5c0-1.036.84-1.875 1.875-1.875h10.375a1.875 1.875 0 010 3.75H5.375A1.875 1.875 0 013.5 17.5z" clip-rule="evenodd" /></svg></button>
                        <button class="p-1.5 rounded-md text-[var(--muted-foreground)] hover:bg-black/5 dark:hover:bg-white/10 hover:text-indigo-500" onclick="window.openNoteEditor('${paper.id}')" title="メモを編集"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.75 5.25a.75.75 0 01.75-.75h11.5a.75.75 0 010 1.5H4.5a.75.75 0 01-.75-.75zm0 5a.75.75 0 01.75-.75h11.5a.75.75 0 010 1.5H4.5a.75.75 0 01-.75-.75zm0 5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75z" clip-rule="evenodd" /></svg></button>
                        <button class="p-1.5 rounded-md text-[var(--muted-foreground)] hover:bg-black/5 dark:hover:bg-white/10 hover:text-red-500" onclick="window.deletePaper('${paper.id}')" title="削除"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" /></svg></button>
                    </div>
                </div>
                ${noteHTML ? `<div class="mt-3 pt-3 border-t border-[var(--border-color)] text-sm prose prose-sm max-w-none">${noteHTML}</div>` : ''}
            `;
            categoryContainer.appendChild(card);
        }); papersContainer.appendChild(categoryContainer);
    });
    const currentUser = auth.currentUser;
    document.querySelectorAll('.admin-only').forEach(el => {
        if(el.tagName === 'ASIDE') { el.style.display = currentUser ? 'block' : 'none'; }
        else { el.style.display = currentUser ? 'flex' : 'none'; }
    });
}

window.deletePaper = async (paperId) => {
    if (confirm('この論文を削除してもよろしいですか？')) {
        try { await db.collection('papers').doc(paperId).delete(); showToast('論文を削除しました', 'success'); }
        catch (e) { showToast('削除に失敗しました', 'error'); }
    }
};

window.changePaperStatus = async (paperId) => {
    const paper = papers.find(p => p.id === paperId); if (!paper) return;
    const currentStatus = paper.status || 'unread';
    if (currentStatus === 'read' && !confirm('この論文を「未読」に戻しますか？')) return;
    const currentIndex = STATUS_CYCLE.indexOf(currentStatus);
    const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length];
    const updateData = { status: nextStatus };
    if (nextStatus === 'read' && currentStatus !== 'read') updateData.readAt = firebase.firestore.FieldValue.serverTimestamp();
    else if (nextStatus !== 'read') updateData.readAt = firebase.firestore.FieldValue.delete();
    try { await db.collection('papers').doc(paperId).update(updateData); }
    catch (e) { showToast('ステータスの更新に失敗しました', 'error'); }
};

window.openNoteEditor = (paperId) => {
    currentEditingPaperId = paperId; const paper = papers.find(p => p.id === paperId); if (!paper) return;
    noteModalTitle.textContent = `メモを編集: ${paper.title}`;
    noteEditor.value = paper.note || ''; notePreview.innerHTML = marked.parse(paper.note || '');
    noteModal.classList.remove('hidden'); noteModal.classList.add('flex');
};
const closeNoteEditor = () => {
    noteModal.classList.add('hidden'); noteModal.classList.remove('flex'); currentEditingPaperId = null;
};

window.openEditModal = (paperId) => {
    currentEditingPaperId = paperId; const paper = papers.find(p => p.id === paperId); if (!paper) return;
    editTitleInput.value = paper.title || '';
    editAuthorsInput.value = (paper.authors && paper.authors.length > 0) ? paper.authors.map(a => a.name).join(', ') : '';
    editUrlInput.value = paper.url || ''; editYearInput.value = paper.year || '';
    editCitationsInput.value = paper.citationCount ?? ''; editCategoryInput.value = paper.category || '';
    editModal.classList.remove('hidden'); editModal.classList.add('flex');
};
const closeEditModal = () => {
    editModal.classList.add('hidden'); editModal.classList.remove('flex'); currentEditingPaperId = null; editPaperForm.reset();
};

loginBtn.addEventListener('click', () => { authModal.classList.remove('hidden'); authModal.classList.add('flex'); });
closeAuthModalBtn.addEventListener('click', () => { authModal.classList.add('hidden'); authModal.classList.remove('flex'); });
logoutBtn.addEventListener('click', () => { auth.signOut(); });

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); const email = loginForm['email-address'].value; const password = loginForm['password'].value;
    try {
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); await auth.signInWithEmailAndPassword(email, password);
        authErrorDiv.classList.add('hidden'); closeAuthModalBtn.click();
    } catch (error) {
        console.error("Login failed:", error); authErrorDiv.textContent = 'メールアドレスまたはパスワードが間違っています。';
        authErrorDiv.classList.remove('hidden');
    }
});

autocompleteBtn.addEventListener('click', async () => {
    const query = paperTitleInput.value.trim(); if (!query) { showToast('タイトルまたはURLを入力してください。', 'error'); return; }
    let paperData = null; const match = query.match(ARXIV_ID_REGEX);
    if (match) { const paperId = match[0].replace('.pdf', ''); paperData = await fetchPaperDataByArxivId(paperId); }
    else { paperData = await searchAndFetchPaperDataByQuery(query); }
    if (paperData) {
        paperTitleInput.value = paperData.title || '';
        paperAuthorsInput.value = (paperData.authors && paperData.authors.length > 0) ? paperData.authors.map(a => a.name).join(', ') : '';
        paperUrlDisplayInput.value = paperData.url || ''; paperYearInput.value = paperData.year || '';
        paperCitationsInput.value = paperData.citationCount ?? ''; showToast('論文情報を補完しました。', 'success');
    } else { showToast('論文情報が見つかりませんでした。', 'error'); }
});

paperForm.addEventListener('submit', async (e) => {
    e.preventDefault(); addBtn.disabled = true; btnText.classList.add('hidden'); btnLoader.classList.remove('hidden');
    try {
        const title = paperTitleInput.value.trim(); if (!title) throw new Error('タイトルは必須です。');
        const newPaperData = {
            title: title,
            authors: paperAuthorsInput.value.trim().split(',').filter(Boolean).map(name => ({ name: name.trim() })),
            url: paperUrlDisplayInput.value.trim() || null,
            year: paperYearInput.value.trim() ? parseInt(paperYearInput.value, 10) : null,
            citationCount: paperCitationsInput.value.trim() ? parseInt(paperCitationsInput.value, 10) : null,
            category: paperCategoryInput.value.trim(), note: paperNoteInput.value.trim(), status: 'unread', readAt: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('papers').add(newPaperData); showToast('論文を追加しました', 'success'); paperForm.reset();
    } catch (error) {
        showToast(error.message || '処理中にエラーが発生しました。', 'error'); console.error("Error adding document:", error);
    } finally { addBtn.disabled = false; btnText.classList.remove('hidden'); btnLoader.classList.add('hidden'); }
});

noteEditor.addEventListener('input', () => { notePreview.innerHTML = marked.parse(noteEditor.value); });

saveNoteBtn.addEventListener('click', async () => {
    if (!currentEditingPaperId) return; saveNoteBtn.disabled = true;
    try {
        await db.collection('papers').doc(currentEditingPaperId).update({ note: noteEditor.value });
        showToast('メモを保存しました', 'success'); closeNoteEditor();
    } catch (error) { showToast('保存に失敗しました', 'error'); }
    finally { saveNoteBtn.disabled = false; }
});

closeModalBtn.addEventListener('click', closeNoteEditor); cancelNoteBtn.addEventListener('click', closeNoteEditor);

saveEditBtn.addEventListener('click', async () => {
    if (!currentEditingPaperId) return;
    const updatedData = {
        title: editTitleInput.value.trim(),
        authors: editAuthorsInput.value.trim().split(',').filter(Boolean).map(name => ({ name: name.trim() })),
        url: editUrlInput.value.trim(),
        year: editYearInput.value.trim() ? parseInt(editYearInput.value, 10) : null,
        citationCount: editCitationsInput.value.trim() ? parseInt(editCitationsInput.value, 10) : null,
        category: editCategoryInput.value.trim()
    };
    if (!updatedData.title) { showToast('タイトルは必須です。', 'error'); return; }
    saveEditBtn.disabled = true;
    try {
        await db.collection('papers').doc(currentEditingPaperId).update(updatedData);
        showToast('論文情報を更新しました', 'success'); closeEditModal();
    } catch (error) {
        console.error("Failed to update paper:", error); showToast('更新に失敗しました', 'error');
    } finally { saveEditBtn.disabled = false; }
});
cancelEditBtn.addEventListener('click', closeEditModal); closeEditModalBtn.addEventListener('click', closeEditModal);

function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast show ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
    setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3000);
}

function updateFilterButtons() {
    const baseClass = 'filter-btn px-4 py-2 text-sm font-medium transition-colors focus:outline-none';
    const activeClass = 'bg-[var(--primary-color)] text-white'; const inactiveClass = 'bg-[var(--card-background)] text-[var(--foreground)] hover:bg-[var(--card-hover-background)]';
    filterAllBtn.className = `${baseClass} rounded-l-md ${currentStatusFilter === 'all' ? activeClass : inactiveClass}`;
    filterToReadBtn.className = `${baseClass} border-l border-[var(--border-color)] ${currentStatusFilter === 'to-read' ? activeClass : inactiveClass}`;
    filterUnreadBtn.className = `${baseClass} border-l border-[var(--border-color)] ${currentStatusFilter === 'unread' ? activeClass : inactiveClass}`;
    filterSkimmedBtn.className = `${baseClass} border-l border-[var(--border-color)] ${currentStatusFilter === 'skimmed' ? activeClass : inactiveClass}`;
    filterReadBtn.className = `${baseClass} border-l border-[var(--border-color)] rounded-r-md ${currentStatusFilter === 'read' ? activeClass : inactiveClass}`;
}

function updateCategoryFilterOptions() {
    const categories = [...new Set(papers.map(p => p.category).filter(Boolean))];
    const prevValue = categoryFilterSelect.value;
    categoryFilterSelect.innerHTML = '<option value="all">すべてのカテゴリ</option>';
    categories.sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category; option.textContent = category; categoryFilterSelect.appendChild(option);
    });
    if (categories.includes(prevValue)) categoryFilterSelect.value = prevValue;
}

filterAllBtn.addEventListener('click', () => { currentStatusFilter = 'all'; updateFilterButtons(); renderPapers(); });
filterReadBtn.addEventListener('click', () => { currentStatusFilter = 'read'; updateFilterButtons(); renderPapers(); });
filterUnreadBtn.addEventListener('click', () => { currentStatusFilter = 'unread'; updateFilterButtons(); renderPapers(); });
filterToReadBtn.addEventListener('click', () => { currentStatusFilter = 'to-read'; updateFilterButtons(); renderPapers(); });
filterSkimmedBtn.addEventListener('click', () => { currentStatusFilter = 'skimmed'; updateFilterButtons(); renderPapers(); });
categoryFilterSelect.addEventListener('change', (e) => { currentCategoryFilter = e.target.value; renderPapers(); });

document.addEventListener('DOMContentLoaded', () => {
    paperForm.reset(); updateFilterButtons(); startDataListening();
});
