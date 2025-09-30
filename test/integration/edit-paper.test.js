import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('論文編集機能 結合テスト', () => {
  let dom;
  let stateModule, uiModule, firebaseModule, domModule;

  const initialPapers = [
    { id: 'paper-to-edit', title: '元のタイトル', authors: [{name: '元の著者'}], url: 'http://example.com', year: 2023, citationCount: 10, category: 'A' },
  ];

  beforeEach(async () => {
    // 1. 必要なDOM要素をセットアップ
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="papers-container"></div>
          <div id="toast"></div>
          <select id="category-filter"></select>
          <div id="empty-state" class="hidden"></div>
          <div id="edit-modal" class="hidden">
            <form id="edit-paper-form">
              <input id="edit-title" />
              <input id="edit-authors" />
              <input id="edit-url" />
              <input id="edit-year" />
              <input id="edit-citations" />
              <input id="edit-category" />
            </form>
            <button id="save-edit-btn"></button>
            <button id="cancel-edit-btn"></button>
            <button id="close-edit-modal-btn"></button>
          </div>
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
    // open/closeは実際の動作を確認するため、スパイするだけ
    vi.spyOn(uiModule, 'openEditModal');
    vi.spyOn(uiModule, 'closeEditModal');

    // 4. script.jsのイベントリスナーを手動で再現
    domModule.papersContainer.addEventListener('click', (e) => {
        const target = e.target.closest('button[data-action]');
        if (target?.dataset.action === 'open-edit-modal') {
            uiModule.openEditModal(target.dataset.paperId);
        }
    });
    domModule.saveEditBtn.addEventListener('click', async () => {
        const updatedData = { title: domModule.editTitleInput.value, /* 他は省略 */ };
        if (!updatedData.title) {
            uiModule.showToast('タイトルは必須です。', 'error');
            return;
        }
        try {
            await firebaseModule.updatePaper(stateModule.state.currentEditingPaperId, updatedData);
            uiModule.showToast('論文情報を更新しました', 'success');
            uiModule.closeEditModal();
        } catch (_error) {
            uiModule.showToast('更新に失敗しました', 'error');
        }
    });
    domModule.cancelEditBtn.addEventListener('click', uiModule.closeEditModal);
    domModule.closeEditModalBtn.addEventListener('click', uiModule.closeEditModal);

    // 5. stateとUIを初期化
    stateModule.updateState({ papers: initialPapers });
    uiModule.renderPapers();
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('編集ボタンをクリックすると、モーダルが開きデータが設定される', () => {
    // Arrange
    const editButton = document.querySelector('button[data-action="open-edit-modal"]');

    // Act
    editButton.click();

    // Assert
    expect(uiModule.openEditModal).toHaveBeenCalledWith('paper-to-edit');
    expect(domModule.editModal.classList.contains('hidden')).toBe(false);
    expect(domModule.editTitleInput.value).toBe('元のタイトル');
    expect(domModule.editAuthorsInput.value).toBe('元の著者');
  });

  it('フォームを編集して保存すると、更新処理が呼ばれ、成功通知が表示される', async () => {
    // Arrange
    const updatePaperSpy = vi.spyOn(firebaseModule, 'updatePaper').mockResolvedValue();
    // まずモーダルを開く
    document.querySelector('button[data-action="open-edit-modal"]').click();
    // データを編集
    domModule.editTitleInput.value = '更新されたタイトル';

    // Act
    domModule.saveEditBtn.click();
    await vi.waitFor(() => expect(updatePaperSpy).toHaveBeenCalled());

    // Assert
    expect(updatePaperSpy).toHaveBeenCalledWith('paper-to-edit', expect.objectContaining({ title: '更新されたタイトル' }));
    expect(uiModule.showToast).toHaveBeenCalledWith('論文情報を更新しました', 'success');
    expect(uiModule.closeEditModal).toHaveBeenCalled();
  });

  it('タイトルを空にして保存しようとすると、エラーが表示され更新処理は呼ばれない', async () => {
    // Arrange
    const updatePaperSpy = vi.spyOn(firebaseModule, 'updatePaper');
    document.querySelector('button[data-action="open-edit-modal"]').click();
    domModule.editTitleInput.value = ''; // タイトルを空にする

    // Act
    domModule.saveEditBtn.click();
    // 同期的な処理なのでwaitForは不要

    // Assert
    expect(updatePaperSpy).not.toHaveBeenCalled();
    expect(uiModule.showToast).toHaveBeenCalledWith('タイトルは必須です。', 'error');
    // モーダルは閉じない
    expect(uiModule.closeEditModal).not.toHaveBeenCalled();
  });
});
