import { state } from './state.js';

export function calculateMaxStreak(readPapers) {
    if (!readPapers || readPapers.length === 0) {
        return 0;
    }
    const readDates = [...new Set(readPapers.filter(p => p.readAt).map(p => p.readAt.toDate().toISOString().split('T')[0]))].sort();
    if (readDates.length === 0) {
        return 0;
    }

    let maxStreak = 1;
    let currentStreak = 1;
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
    return maxStreak;
}

export function calculateTopCategory(readPapers) {
    let topCategory = { name: 'N/A', count: 0 };
    if (!readPapers || readPapers.length === 0) {
        return topCategory;
    }

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
    return topCategory;
}

function renderKeyAchievements() {
    const container = document.getElementById('key-achievements-container');
    if (!container) return;
    
    const readPapers = state.papers.filter(p => p.status === 'read' && p.readAt && p.readAt.toDate);
    
    const maxStreak = calculateMaxStreak(readPapers);
    const topCategory = calculateTopCategory(readPapers);

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

export function calculateTopAuthors(readPapers, limit = 10) {
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
    const sortedAuthors = Object.entries(authorData).sort(([,a],[,b]) => b.count-a.count).slice(0, limit);
    return sortedAuthors.map(([name, data]) => {
        const topCategory = Object.entries(data.categories).sort(([,a],[,b]) => b-a)[0][0];
        return { name, count: data.count, topCategory };
    });
}

export function calculateStatusCounts(papers) {
    return papers.reduce((acc, p) => {
        const status = p.status || 'unread';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});
}

export function calculateYearCounts(papers) {
    return papers.reduce((acc, p) => {
        if (p.year) {
            acc[p.year] = (acc[p.year] || 0) + 1;
        }
        return acc;
    }, {});
}

function renderDetailedStats() {
    const readPapers = state.papers.filter(p => p.status === 'read' && p.readAt && p.readAt.toDate);
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

    Object.values(state.charts).forEach(chart => chart.destroy());
    
    const style = getComputedStyle(document.documentElement);
    const primaryColor = style.getPropertyValue('--primary-color').trim();
    
    const monthlyReads = {};
    for(let i=11; i>=0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyReads[key] = 0;
    }
    readPapers.forEach(p => {
        const d = p.readAt.toDate();
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if(Object.prototype.hasOwnProperty.call(monthlyReads, key)) monthlyReads[key]++;
    });
    state.charts.monthly = new Chart(document.getElementById('monthly-reads-chart').getContext('2d'), {
        type: 'bar', data: { labels: Object.keys(monthlyReads), datasets: [{ label: '読了数', data: Object.values(monthlyReads), backgroundColor: primaryColor, borderRadius: 4 }] },
        options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });

    const categoryCounts = readPapers.reduce((acc, p) => {
        const cat = p.category || '未分類'; acc[cat] = (acc[cat] || 0) + 1; return acc; }, {});
    state.charts.category = new Chart(document.getElementById('category-reads-chart').getContext('2d'), {
        type: 'doughnut', data: { labels: Object.keys(categoryCounts), datasets: [{ data: Object.values(categoryCounts), backgroundColor: ['#4f46e5', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'], borderColor: style.getPropertyValue('--background').trim() }] }
    });

    const yearCounts = calculateYearCounts(readPapers);
    const sortedYears = Object.keys(yearCounts).sort((a,b) => a - b);
    state.charts.year = new Chart(document.getElementById('year-distribution-chart').getContext('2d'), {
        type: 'bar', data: { labels: sortedYears, datasets: [{ label: '発表年', data: sortedYears.map(y => yearCounts[y]), backgroundColor: primaryColor }] },
        options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });

    const topAuthors = calculateTopAuthors(readPapers);
    const topAuthorsContainer = document.getElementById('top-authors-container');
    topAuthorsContainer.innerHTML = topAuthors.map((author, index) => {
        return `
            <div class="flex justify-between items-center py-1.5 border-b border-[var(--border-color)]">
                <div>
                    <p class="font-semibold">${index + 1}. ${author.name}</p>
                    <p class="text-xs text-[var(--muted-foreground)]">${author.topCategory}</p>
                </div>
                <span class="font-bold text-lg text-[var(--primary-color)]">${author.count}</span>
            </div>`;
    }).join('') || `<p class="text-center text-[var(--muted-foreground)]">データがありません。</p>`;
}

function renderCategoryStats() {
    const container = document.getElementById('category-stats-container');
    if (!container) return;
    container.innerHTML = '';
    const readPapers = state.papers.filter(p => p.status === 'read');
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
    state.papers.filter(p => p.status === 'read' && p.readAt && typeof p.readAt.toDate === 'function').forEach(p => {
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

export function renderOtherPage() {
    renderKeyAchievements();
    renderDetailedStats();
    renderContributionGraph();
    renderCategoryStats();
}
