import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('論文削除機能 結合テスト', () => {
  let dom;
  let stateModule, uiModule, firebaseModule, domModule;

  const initialPapers = [
    { id: 'paper-to-delete', title: '削除される論文', status: 'unread' },
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

    // 2. モジュールをリセットし、動的にインポート
    vi.resetModules();
    stateModule = await import('../../js/state.js');
    uiModule = await import('../../js/ui.js');
    firebaseModule = await import('../../js/firebase.js');
    domModule = await import('../../js/dom.js');
    
    // 3. スパイを先に設定
    vi.spyOn(uiModule, 'showToast');
    vi.spyOn(window, 'confirm');

    // 4. script.jsのイベントリスナーを手動で再現
    domModule.papersContainer.addEventListener('click', async (e) => {
        const target = e.target.closest('button[data-action]');
        if (!target) return;
        const { action, paperId } = target.dataset;

        if (action === 'delete-paper') {
            if (window.confirm('この論文を削除してもよろしいですか？')) {
                try {
                    await firebaseModule.deletePaper(paperId);
                    uiModule.showToast('論文を削除しました', 'success');
                } catch (_err) {
                                uiModule.showToast('削除に失敗しました', 'error');
                            }            }
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

  it('確認ダイアログで「はい」を選択すると、削除処理が呼ばれ、成功通知が表示される', async () => {
    // Arrange
    window.confirm.mockReturnValue(true);
    const deletePaperSpy = vi.spyOn(firebaseModule, 'deletePaper').mockResolvedValue();
    const deleteButton = document.querySelector('button[data-action="delete-paper"]');

    // Act
    deleteButton.click();
    await vi.waitFor(() => expect(deletePaperSpy).toHaveBeenCalled());

    // Assert
    expect(window.confirm).toHaveBeenCalled();
    expect(deletePaperSpy).toHaveBeenCalledWith('paper-to-delete');
    expect(uiModule.showToast).toHaveBeenCalledWith('論文を削除しました', 'success');
  });

  it('確認ダイアログで「いいえ」を選択すると、削除処理は呼ばれない', async () => {
    // Arrange
    window.confirm.mockReturnValue(false);
    const deletePaperSpy = vi.spyOn(firebaseModule, 'deletePaper');
    const deleteButton = document.querySelector('button[data-action="delete-paper"]');

    // Act
    deleteButton.click();

    // Assert
    expect(window.confirm).toHaveBeenCalled();
    expect(deletePaperSpy).not.toHaveBeenCalled();
    expect(uiModule.showToast).not.toHaveBeenCalled();
  });

  it('削除処理が失敗した場合、エラー通知が表示される', async () => {
    // Arrange
    window.confirm.mockReturnValue(true);
    const deletePaperSpy = vi.spyOn(firebaseModule, 'deletePaper').mockRejectedValue(new Error('Delete failed'));
    const deleteButton = document.querySelector('button[data-action="delete-paper"]');

    // Act
    deleteButton.click();
    await vi.waitFor(() => expect(deletePaperSpy).toHaveBeenCalled());

    // Assert
    expect(window.confirm).toHaveBeenCalled();
    expect(deletePaperSpy).toHaveBeenCalledWith('paper-to-delete');
    expect(uiModule.showToast).toHaveBeenCalledWith('削除に失敗しました', 'error');
  });
});
