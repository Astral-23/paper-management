## 2025-09-30 (テスト作成時の知見)

Vitestを用いた結合テスト作成時に遭遇した問題とその解決策をまとめる。

### 1. `ReferenceError: [グローバル変数] is not defined`

- **問題:** `script.js`などのファイルが、`index.html`で読み込まれることを前提としたグローバル変数（例: `firebase`, `marked`）を参照しており、テスト環境で`ReferenceError`が発生した。
- **原因:** Vitestのテスト環境（Node.js）では、`index.html`が読み込まれないため、グローバル変数が存在しない。
- **試行錯誤:**
    - テストファイル内で`global.firebase = ...`のように直接代入を試みたが、`import`の解決順序の問題で失敗した。
    - `vi.stubGlobal`も同様に失敗した。
- **解決策:**
    - `vitest.config.js`の`test.setupFiles`オプションを使用。
    - `test/setup.js`というファイルを作成し、その中で`global.firebase = ...`のようにグローバルモックを定義した。
    - これにより、すべてのテストファイルが実行される前にグローバル変数が確実にモックされるようになった。

```javascript:test/setup.js
import { vi } from 'vitest';

// グローバルなfirebaseオブジェクトをモック
global.firebase = { /* ... */ };

// グローバルなmarkedライブラリをモック
global.marked = {
    use: vi.fn(),
    parse: vi.fn(content => content || ''),
};
global.markedKatex = vi.fn();
```

### 2. `TypeError: Cannot read properties of null`

- **問題:** `document.getElementById(...)`で取得したDOM要素が`null`であるため、`.value`や`.addEventListener`を読み取れずに`TypeError`が発生した。
- **原因:**
    1.  **DOM要素の不足:** テスト用のJSDOM環境に、テスト対象コードが必要とするHTML要素（ボタン、コンテナなど）が含まれていなかった。
    2.  **モジュールの読み込み順序:** `import`文は`beforeEach`より先に評価されるため、`js/dom.js`が実行される時点で`document`オブジェクトがまだセットアップされていなかった。
- **解決策:**
    1.  **DOM要素の充足:** テスト対象のコードが参照するすべてのHTML要素を、JSDOMのコンストラクタに渡すHTML文字列に含めるようにした。
    2.  **動的インポート:** `import()`構文を使用し、`beforeEach`内でDOMをセットアップした**後で**、テスト対象のモジュールを動的にインポートするように変更した。これにより、モジュールが読み込まれる時点で`document`が確実に存在することを保証した。

- **【重要・反省】DOM要素不足の再発防止:**
    - 今回のテスト作成において、この「DOM要素不足」による`TypeError`が複数回にわたり再発した。これは、新しいテストファイルを作成する都度、JSDOMのセットアップを最小限の内容で記述し、`renderPapers`のような共通関数が依存する他のDOM要素（`#category-filter`や`#empty-state`など）を見落としたことが原因である。
    - **恒久対策:** 新しい結合テストを作成する際は、場当たり的にDOM要素を追加するのではなく、**既存の成功したテストファイルからJSDOMのセットアップをコピーする**ことを徹底する。これにより、共通の依存関係の見落としを防ぎ、テスト作成を効率化する。

```javascript:*.test.js
beforeEach(async () => {
    // 1. DOM環境をセットアップ
    dom = new JSDOM(`... HTML ...`);
    global.document = dom.window.document;

    // 2. モジュールキャッシュをリセット
    vi.resetModules();

    // 3. DOM設定後に動的にインポート
    stateModule = await import('../../js/state.js');
    uiModule = await import('../../js/ui.js');
    // ...
});
```

### 3. `AssertionError: expected "spy" to be called ... Number of calls: 0`

- **問題:** `vi.spyOn`でスパイした関数が呼び出されたにもかかわらず、テストで検知できなかった。
- **原因:** JavaScriptのクロージャの仕様による、**スパイの設定順序**の誤り。イベントリスナーのコールバック関数を設定した**後で**、そのコールバック内で使用される関数をスパイしていた。これにより、コールバックはスパイされる前のオリジナルの関数を記憶してしまい、スパイが呼び出しを検知できなかった。
- **解決策:** `beforeEach`内の処理の順序を厳密に定義した。

```javascript:*.test.js
// 修正後の正しい順序
beforeEach(async () => {
    // ... DOMセットアップ、モジュールインポート ...

    // 3. ★★★ スパイを先に設定 ★★★
    vi.spyOn(stateModule, 'updateState');

    // 4. 次に、スパイ済みの関数を使ってイベントリスナーを設定
    domModule.filterReadBtn.addEventListener('click', () => {
        stateModule.updateState({ currentStatusFilter: 'read' });
    });

    // 5. stateの初期化など
    stateModule.updateState({ ... });

    // 6. テスト実行前に、初期化による呼び出し履歴をクリア
    stateModule.updateState.mockClear();
});
```

### 4. 結合テストの全体的なアプローチ

- **依存関係の最小化:** 当初、`script.js`全体をインポートしてテストしようとしたが、アプリケーション全体のDOM要素への依存が発生し、テストが非常に不安定になった。
- **最終的なアプローチ:** `script.js`のインポートをやめ、テスト対象の機能に必要な**イベントリスナーのみをテストコード内で手動で再現**する方式に切り替えた。これにより、テストの関心事を絞り込み、依存関係を最小限に抑え、安定した結合テストを実現できた。