import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('フィルタリング機能 結合テスト', () => {
  let dom;
  // モジュール全体を格納する変数を宣言
  let stateModule, uiModule, domModule;

  const initialPapers = [
    { id: '1', title: '既読の論文', status: 'read' },
    { id: '2', title: '未読の論文', status: 'unread' },
    { id: '3', title: 'これも既読', status: 'read' },
  ];

  beforeEach(async () => {
    // 1. DOM環境をセットアップ
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <button id="filter-all"></button>
          <button id="filter-read"></button>
          <button id="filter-unread"></button>
          <button id="filter-to-read"></button>
          <button id="filter-skimmed"></button>
          <div id="papers-container"></div>
          <div id="empty-state" class="hidden"></div>
          <select id="category-filter"></select>
        </body>
      </html>
    `);
    global.document = dom.window.document;
    global.window = dom.window;

    // 2. モジュールをリセットし、動的にインポート
    vi.resetModules();
    stateModule = await import('../../js/state.js');
    uiModule = await import('../../js/ui.js');
    domModule = await import('../../js/dom.js');

    // 3. ★★★ スパイを先に設定 ★★★
    vi.spyOn(stateModule, 'updateState');
    vi.spyOn(uiModule, 'renderPapers');
    vi.spyOn(uiModule, 'updateFilterButtons');

    // 4. 次に、スパイ済みの関数を使ってイベントリスナーを設定
    domModule.filterReadBtn.addEventListener('click', () => { 
        stateModule.updateState({ currentStatusFilter: 'read' }); 
        uiModule.updateFilterButtons(); 
        uiModule.renderPapers(); 
    });
    domModule.filterAllBtn.addEventListener('click', () => { 
        stateModule.updateState({ currentStatusFilter: 'all' }); 
        uiModule.updateFilterButtons(); 
        uiModule.renderPapers(); 
    });

    // 5. stateとUIを初期化
    stateModule.updateState({ papers: initialPapers, currentStatusFilter: 'all' });
    uiModule.renderPapers();

    // 6. テスト実行前に、初期化による呼び出し履歴をクリア
    stateModule.updateState.mockClear();
    uiModule.renderPapers.mockClear();
    uiModule.updateFilterButtons.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.document = undefined;
    global.window = undefined;
  });

  it('「既読」ボタンをクリックすると、既読の論文のみが表示される', () => {
    // Act
    domModule.filterReadBtn.click();

    // Assert
    expect(stateModule.updateState).toHaveBeenCalledWith({ currentStatusFilter: 'read' });
    expect(uiModule.updateFilterButtons).toHaveBeenCalled();
    expect(uiModule.renderPapers).toHaveBeenCalled();

    const renderedHTML = domModule.papersContainer.innerHTML;
    expect(renderedHTML).toContain('既読の論文');
    expect(renderedHTML).not.toContain('未読の論文');
  });

  it('「すべて」ボタンをクリックすると、すべての論文が表示される', () => {
    // Arrange
    // 先に「既読」状態にしておく（このupdateStateはスパイされている）
    stateModule.updateState({ currentStatusFilter: 'read' });
    uiModule.renderPapers();
    // 履歴をクリア
    stateModule.updateState.mockClear();
    uiModule.renderPapers.mockClear();

    // Act
    domModule.filterAllBtn.click();

    // Assert
    expect(stateModule.updateState).toHaveBeenCalledWith({ currentStatusFilter: 'all' });
    expect(uiModule.renderPapers).toHaveBeenCalled();

    const renderedHTML = domModule.papersContainer.innerHTML;
    expect(renderedHTML).toContain('既読の論文');
    expect(renderedHTML).toContain('未読の論文');
  });
});
