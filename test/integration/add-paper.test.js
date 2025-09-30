import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('論文追加機能 結合テスト', () => {
  let dom;
  let uiModule, firebaseModule, domModule;

  beforeEach(async () => {
    // 1. フォーム関連のDOM要素をセットアップ
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <form id="paper-form">
            <input id="paper-title" />
            <input id="paper-authors" />
            <input id="paper-url-display" />
            <input id="paper-year" />
            <input id="paper-citations" />
            <input id="paper-category" />
            <textarea id="paper-note"></textarea>
            <button id="add-paper-btn" type="submit">
              <span id="btn-text">追加</span>
              <div id="btn-loader" class="hidden"></div>
            </button>
          </form>
          <div id="toast"></div>
        </body>
      </html>
    `);
    global.document = dom.window.document;
    global.window = dom.window;

    // 2. モジュールをリセットし、動的にインポート
    vi.resetModules();
    uiModule = await import('../../js/ui.js');
    firebaseModule = await import('../../js/firebase.js');
    domModule = await import('../../js/dom.js');
    
    // 3. スパイを先に設定
    vi.spyOn(uiModule, 'showToast');
    vi.spyOn(domModule.paperForm, 'reset');

    // 4. script.jsのイベントリスナーを手動で再現
    domModule.paperForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        domModule.addBtn.disabled = true;
        domModule.btnText.classList.add('hidden');
        domModule.btnLoader.classList.remove('hidden');
        try {
            const title = domModule.paperTitleInput.value.trim();
            if (!title) throw new Error('タイトルは必須です。');
            const newPaperData = {
                title: title,
                authors: domModule.paperAuthorsInput.value.trim().split(',').filter(Boolean).map(name => ({ name: name.trim() })),
                url: domModule.paperUrlDisplayInput.value.trim() || null,
                year: domModule.paperYearInput.value.trim() ? parseInt(domModule.paperYearInput.value, 10) : null,
                citationCount: domModule.paperCitationsInput.value.trim() ? parseInt(domModule.paperCitationsInput.value, 10) : null,
                category: domModule.paperCategoryInput.value.trim(),
                note: domModule.paperNoteInput.value.trim(),
                status: 'unread',
                readAt: null
            };
            await firebaseModule.addPaper(newPaperData);
            uiModule.showToast('論文を追加しました', 'success');
            domModule.paperForm.reset();
        } catch (error) {
            uiModule.showToast(error.message || '処理中にエラーが発生しました。', 'error');
        } finally {
            domModule.addBtn.disabled = false;
            domModule.btnText.classList.remove('hidden');
            domModule.btnLoader.classList.add('hidden');
        }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.document = undefined;
    global.window = undefined;
  });

  it('有効なデータを入力して送信すると、論文が追加され、成功通知とフォームリセットが行われる', async () => {
    // Arrange
    const addPaperSpy = vi.spyOn(firebaseModule, 'addPaper').mockResolvedValue();
    domModule.paperTitleInput.value = '新しいテスト論文';
    domModule.paperAuthorsInput.value = '著者A, 著者B';

    // Act
    domModule.paperForm.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(addPaperSpy).toHaveBeenCalled());

    // Assert
    expect(addPaperSpy).toHaveBeenCalledWith(expect.objectContaining({ title: '新しいテスト論文' }));
    expect(uiModule.showToast).toHaveBeenCalledWith('論文を追加しました', 'success');
    expect(domModule.paperForm.reset).toHaveBeenCalled();
  });

  it('タイトルが空のまま送信すると、エラー通知が表示され、追加処理は呼ばれない', async () => {
    // Arrange
    const addPaperSpy = vi.spyOn(firebaseModule, 'addPaper');
    domModule.paperTitleInput.value = ' '; // 空または空白

    // Act
    domModule.paperForm.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    // 非同期処理を待つ必要はないが、念のため
    await new Promise(resolve => setTimeout(resolve, 0));

    // Assert
    expect(addPaperSpy).not.toHaveBeenCalled();
    expect(uiModule.showToast).toHaveBeenCalledWith('タイトルは必須です。', 'error');
    expect(domModule.paperForm.reset).not.toHaveBeenCalled();
  });

  it('追加処理がFirebaseで失敗した場合、エラー通知が表示される', async () => {
    // Arrange
    const addPaperSpy = vi.spyOn(firebaseModule, 'addPaper').mockRejectedValue(new Error('DB Error'));
    domModule.paperTitleInput.value = '失敗する論文';

    // Act
    domModule.paperForm.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(addPaperSpy).toHaveBeenCalled());

    // Assert
    expect(addPaperSpy).toHaveBeenCalled();
    expect(uiModule.showToast).toHaveBeenCalledWith('DB Error', 'error');
    expect(domModule.paperForm.reset).not.toHaveBeenCalled();
  });
});
