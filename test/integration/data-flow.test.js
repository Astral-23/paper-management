import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// このテストスイートでは、DOMのセットアップ後にモジュールを動的にインポートする

describe('データフロー結合テスト', () => {
  let dom;
  // モジュールを格納する変数を定義
  let state, ui, firebase;

  beforeEach(async () => {
    // 1. JSDOMでDOM環境をセットアップし、グローバルに設定
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="papers-container"></div><select id="category-filter"></select><div id="empty-state" class="hidden"></div></body></html>');
    global.document = dom.window.document;
    global.window = dom.window;

    // 2. モジュールキャッシュをリセットして、常にクリーンな状態でインポートする
    vi.resetModules();

    // 3. DOMセットアップ後に、テスト対象のモジュールを動的にインポート
    state = await import('../../js/state.js');
    ui = await import('../../js/ui.js');
    firebase = await import('../../js/firebase.js');

    // 4. stateを初期状態にリセット
    state.updateState(JSON.parse(JSON.stringify({
        papers: [],
        currentStatusFilter: 'all',
        currentCategoryFilter: 'all',
        sortOrder: 'publicationYear',
        initialLoad: true,
        currentEditingPaperId: null,
    })));

    // 5. モックとスパイをクリア
    vi.clearAllMocks();

    // 6. 必要な関数をスパイ
    vi.spyOn(state, 'updateState').mockImplementation((newState) => {
        Object.assign(state.state, newState);
        if (newState.papers) {
            ui.renderPapers();
        }
    });
    vi.spyOn(ui, 'renderPapers');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.document = undefined;
    global.window = undefined;
    delete global.mockOnSnapshotCallback;
    delete global.mockOnSnapshotErrorCallback;
  });

  it('Firestoreのデータ更新がstate.updateStateとui.renderPapersを順に呼び出す', () => {
    // Arrange
    const onDataChange = vi.fn();
    const onError = vi.fn();
    firebase.startDataListening(onDataChange, onError);

    const mockPapers = [{ id: '1', title: 'Test Paper', status: 'read', category: 'Test' }];
    const mockSnapshot = {
      docs: mockPapers.map(doc => ({ id: doc.id, data: () => doc })),
    };

    // Act
    expect(global.mockOnSnapshotCallback).toBeDefined();
    global.mockOnSnapshotCallback(mockSnapshot);

    // Assert
    expect(state.updateState).toHaveBeenCalledWith({ initialLoad: false });
    expect(state.updateState).toHaveBeenCalledWith({ papers: mockPapers });
    expect(onDataChange).toHaveBeenCalled();
    expect(ui.renderPapers).toHaveBeenCalled();

    const updateStateOrder = state.updateState.mock.invocationCallOrder[1];
    const renderPapersOrder = ui.renderPapers.mock.invocationCallOrder[0];
    expect(updateStateOrder).toBeLessThan(renderPapersOrder);
  });
});
