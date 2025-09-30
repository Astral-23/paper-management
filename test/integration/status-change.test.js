import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('ステータス変更機能 結合テスト', () => {
  let dom;
  let stateModule, uiModule, firebaseModule, domModule;

  const initialPapers = [
    { id: 'paper-1', title: 'テスト論文', status: 'unread' },
  ];

  beforeEach(async () => {
    // 1. 必要なDOM要素をセットアップ
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="papers-container"></div>
          <div id="toast"></div>
          <div id="empty-state" class="hidden"></div>
          <select id="category-filter"></select>
        </body>
      </html>
    `);
    global.document = dom.window.document;
    global.window = dom.window;
    global.confirm = vi.fn(() => true);

    // 2. モジュールをリセットし、動的にインポート
    vi.resetModules();
    stateModule = await import('../../js/state.js');
    uiModule = await import('../../js/ui.js');
    firebaseModule = await import('../../js/firebase.js');
    domModule = await import('../../js/dom.js');
    
    // 3. スパイを先に設定
    vi.spyOn(uiModule, 'showToast');

    // 4. script.jsのイベントリスナーを手動で再現
    domModule.papersContainer.addEventListener('click', async (e) => {
        const target = e.target.closest('button[data-action]');
        if (!target) return;
        const { action, paperId } = target.dataset;

        if (action === 'change-status') {
            try {
                await firebaseModule.changePaperStatus(paperId);
                uiModule.showToast('ステータスを更新しました', 'success');
            } catch (err) {
                uiModule.showToast('ステータスの更新に失敗しました', 'error');
            }
        }
    });

    // 5. stateとUIを初期化
    stateModule.updateState({ papers: initialPapers });
    uiModule.renderPapers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.document = undefined;
    global.window = undefined;
  });

  it('ステータス変更ボタンをクリックすると、更新処理が呼ばれ、成功通知が表示される', async () => {
    // Arrange
    const changePaperStatusSpy = vi.spyOn(firebaseModule, 'changePaperStatus').mockResolvedValue();
    const statusButton = document.querySelector('button[data-action="change-status"]');

    // Act
    statusButton.click();
    await vi.waitFor(() => expect(changePaperStatusSpy).toHaveBeenCalled());

    // Assert
    expect(changePaperStatusSpy).toHaveBeenCalledWith('paper-1');
    expect(uiModule.showToast).toHaveBeenCalledWith('ステータスを更新しました', 'success');
  });

  it('ステータス変更処理が失敗した場合、エラー通知が表示される', async () => {
    // Arrange
    const changePaperStatusSpy = vi.spyOn(firebaseModule, 'changePaperStatus').mockRejectedValue(new Error('Update failed'));
    const statusButton = document.querySelector('button[data-action="change-status"]');

    // Act
    statusButton.click();
    await vi.waitFor(() => expect(changePaperStatusSpy).toHaveBeenCalled());

    // Assert
    expect(changePaperStatusSpy).toHaveBeenCalledWith('paper-1');
    expect(uiModule.showToast).toHaveBeenCalledWith('ステータスの更新に失敗しました', 'error');
  });
});