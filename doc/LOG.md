## 2025-09-30

### 追加機能：論文リストのソート機能

- **要件:** 論文リストを「投稿日」または「被引用数」でソートできるようにする。デフォルトは「投稿日」。
- **対応:**
    1. `index.html`にソート順を選択するためのプルダウンメニュー (`<select id="sort-order">`) を追加。
    2. `js/state.js`のグローバル状態に`sortOrder`プロパティを追加し、デフォルト値を`'submissionDate'`に設定。
    3. `js/dom.js`に新しいプルダウンメニューのDOM参照を追加。
    4. `js/ui.js`の`renderPapers`関数を修正。描画前に`state.sortOrder`の値に応じて論文リストをソートするロジックを実装。
        - `submissionDate`: `createdAt`プロパティ（タイムスタンプ）の降順でソート。
        - `citationCount`: `citationCount`プロパティの降順でソート。
    5. `script.js`にプルダウンメニューの`change`イベントリスナーを追加。イベント発生時に`state.sortOrder`を更新し、`renderPapers`を再実行してUIを更新するようにした。

### 修正：ソート機能の修正

- **要件:** 「投稿日」のソートを「発表年」でのソートに変更する。
- **対応:**
    1. `index.html`のソートオプションのテキストを「投稿日」から「発表年」に、`value`を`submissionDate`から`publicationYear`に変更。
    2. `js/state.js`の`sortOrder`のデフォルト値を`publicationYear`に変更。
    3. `js/ui.js`のソートロジックを、`createdAt`によるソートから`year`による降順ソートに変更。