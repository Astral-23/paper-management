# テスト設計

## theme.js: 単体テスト

### 1. テスト計画
- **テスト種別**: 単体テスト
- **目的と範囲**: `theme.js`内の各関数が、個別のロジックとして正しく動作することを検証する。DOMの状態変更やlocalStorageへの保存が適切に行われるかを確認する。`dom.js`からのDOM要素の取得やコールバック関数の実行はモックを使用し、`theme.js`のロジックに集中する。
- **テスト対象**: `initializeTheme`, `applyTheme` (間接的にテスト)

### 2. テスト設計
| テストの具体的な内容 | 操作手順 | 期待結果 |
| :--- | :--- | :--- |
| **初期化** | | |
| `initializeTheme`を呼び出すと、テーマ切り替えボタンとテーマ選択肢にイベントリスナーが登録される | 1. `initializeTheme`を実行する<br>2. テーマ切り替えボタンをクリックする<br>3. テーマ選択肢のいずれかをクリックする | 1. エラーが発生しない<br>2. テーマメニューが表示される<br>3. `applyTheme`が適切な引数で呼び出され、テーマメニューが非表示になる |
| **テーマの適用** | | |
| `applyTheme`が`light`テーマで呼び出されると、`<html>`要素の`data-theme`属性が`light`になり、localStorageに`theme=light`が保存される | 1. `applyTheme('light')` を実行する | 1. `document.documentElement.getAttribute('data-theme')`が`'light'`を返す<br>2. `localStorage.getItem('theme')`が`'light'`を返す<br>3. `light`テーマの選択肢に`active`クラスが付与される |
| `applyTheme`が`dark`テーマで呼び出されると、`<html>`要素の`data-theme`属性が`dark`になり、localStorageに`theme=dark`が保存される | 1. `applyTheme('dark')` を実行する | 1. `document.documentElement.getAttribute('data-theme')`が`'dark'`を返す<br>2. `localStorage.getItem('theme')`が`'dark'`を返す<br>3. `dark`テーマの選択肢に`active`クラスが付与される |
| **UIの対話** | | |
| テーマメニュー表示中にメニュー外をクリックすると、メニューが非表示になる | 1. テーマメニューを表示させる<br>2. `document.body`をクリックする | テーマメニューに`hidden`クラスが付与される |
| `otherPage`が表示されている状態でテーマを変更すると、`renderOtherPageCallback`が呼び出される | 1. `otherPage`要素を表示状態にする<br>2. `initializeTheme`にコールバック関数を渡して実行する<br>3. テーマを変更する | 渡されたコールバック関数が呼び出される |

---

## `api.js` - `extractArxivId`

### 1. テスト計画

- **テスト種別**: 単体テスト
- **目的と範囲**: `extractArxivId`関数が、様々な形式の文字列から正しくarXiv IDを抽出、または抽出できない場合はnullを返すことを検証する。副作用のない純粋な関数であるため、入力と出力のみに焦点を当てる。
- **テスト対象**: `js/api.js` の `extractArxivId` 関数。

### 2. テスト設計

| テストの具体的な内容 | 操作手順 | 期待結果 |
| :--- | :--- | :--- |
| 標準的なURLからIDを抽出する | `extractArxivId('https://arxiv.org/abs/2109.12345')` を実行 | `'2109.12345'` が返される |
| バージョン番号付きPDFのURLからIDを抽出する | `extractArxivId('https://arxiv.org/pdf/2109.12345v2.pdf')` を実行 | `'2109.12345v2'` が返される |
| 古い形式のURLからIDを抽出する | `extractArxivId('https://arxiv.org/abs/cs/0112017')` を実行 | `'cs/0112017'` が返される |
| テキストに埋め込まれたURLからIDを抽出する | `extractArxivId('text https://arxiv.org/abs/2201.00001 after')` を実行 | `'2201.00001'` が返される |
| ID文字列のみからIDを抽出する | `extractArxivId('2305.05678')` を実行 | `'2305.05678'` が返される |
| `.pdf`で終わるID文字列を処理する | `extractArxivId('2109.12345.pdf')` を実行 | `'2109.12345'` が返される |
| IDが含まれない文字列 | `extractArxivId('https://example.com')` を実行 | `null` が返される |
| 空文字列 | `extractArxivId('')` を実行 | `null` が返される |

---

## `api.js` - API通信関数

### 1. テスト計画

- **テスト種別**: 単体テスト
- **目的と範囲**: `fetchPaperDataByArxivId` と `searchAndFetchPaperDataByQuery` が、APIの応答に応じて適切にデータを返す、あるいはnullを返すことを検証する。グローバルの`fetch`関数をモックし、API通信をシミュレートする。
- **テスト対象**: `js/api.js` の `fetchPaperDataByArxivId`, `searchAndFetchPaperDataByQuery` 関数。

### 2. テスト設計

| テストの具体的な内容 | 操作手順 | 期待結果 |
| :--- | :--- | :--- |
| **fetchPaperDataByArxivId** | | |
| API通信が成功し、データが返される | 1. `fetch`が成功レスポンス（`ok: true`と論文データ）を返すようにモックする<br>2. `fetchPaperDataByArxivId` を実行 | 1. 正しいエンドポイントにリクエストが送られる<br>2. モックした論文データが返される |
| APIがエラーを返す | 1. `fetch`がエラーレスポンス（`ok: false`）を返すようにモックする<br>2. `fetchPaperDataByArxivId` を実行 | `null` が返される |
| 通信自体が失敗する | 1. `fetch`が例外をスローするようにモックする<br>2. `fetchPaperDataByArxivId` を実行 | `null` が返される |
| **searchAndFetchPaperDataByQuery** | | |
| API通信が成功し、結果が見つかる | 1. `fetch`が成功レスポンス（`ok: true`と論文データ配列）を返すようにモックする<br>2. `searchAndFetchPaperDataByQuery` を実行 | 1. 正しいエンドポイントにリクエストが送られる<br>2. 配列の最初の論文データが返される |
| API通信は成功したが、結果が0件 | 1. `fetch`が成功レスポンス（`ok: true`と空のデータ配列）を返すようにモックする<br>2. `searchAndFetchPaperDataByQuery` を実行 | `null` が返される |
| APIがエラーを返す | 1. `fetch`がエラーレスポンス（`ok: false`）を返すようにモックする<br>2. `searchAndFetchPaperDataByQuery` を実行 | `null` が返される |
| 通信自体が失敗する | 1. `fetch`が例外をスローするようにモックする<br>2. `searchAndFetchPaperDataByQuery` を実行 | `null` が返される |

---

## `firebase.js` - `startDataListening`

### 1. テスト計画

- **テスト種別**: 単体テスト
- **目的と範囲**: `startDataListening`関数が、Firestoreのリスナーを正しく設定し、データ更新時やエラー発生時に適切なコールバックを実行し、状態を更新することを検証する。Firebase SDKと`state.js`はモックする。
- **テスト対象**: `js/firebase.js` の `startDataListening` 関数。

### 2. テスト設計

| テストの具体的な内容 | 操作手順 | 期待結果 |
| :--- | :--- | :--- |
| **データリスニング** | | |
| 正常にデータを取得し、stateとUIを更新する | 1. `startDataListening`を実行する<br>2. モックした`onSnapshot`の成功コールバックを、論文データを含むスナップショットで呼び出す | 1. `updateState`が`initialLoad: false`で呼ばれる<br>2. `updateState`が、古い`read`プロパティを`status: 'read'`に変換した論文データで呼ばれる<br>3. `onDataChange`コールバックが呼ばれる |
| データ取得中にエラーが発生する | 1. `startDataListening`を実行する<br>2. モックした`onSnapshot`のエラーコールバックを、エラーオブジェクトで呼び出す | 1. `onError`コールバックがエラーオブジェクトと共に呼ばれる<br>2. `onDataChange`や`updateState`は呼ばれない |

---

## `config.js`: 単体テスト

### 1. テスト計画
- **テスト種別**: 単体テスト
- **目的と範囲**: `config.js`内の各定数が意図された正しい値を持っていることを確認する。
- **テスト対象**: `MAX_PAPERS_PER_PAGE`, `MAX_TAGS_TO_DISPLAY`, `MAX_AUTHORS_TO_DISPLAY`, `MAX_TITLE_LENGTH`

### 2. テスト設計
| テストの具体的な内容 | 操作手順 | 期待結果 |
| :--- | :--- | :--- |
| `MAX_PAPERS_PER_PAGE`の値が正しい | `MAX_PAPERS_PER_PAGE`をインポートして値を確認する | `50`であること |
| `MAX_TAGS_TO_DISPLAY`の値が正しい | `MAX_TAGS_TO_DISPLAY`をインポートして値を確認する | `5`であること |
| `MAX_AUTHORS_TO_DISPLAY`の値が正しい | `MAX_AUTHORS_TO_DISPLAY`をインポートして値を確認する | `3`であること |
| `MAX_TITLE_LENGTH`の値が正しい | `MAX_TITLE_LENGTH`をインポートして値を確認する | `150`であること |

---

## `ui.js`: 単体テスト

### 1. テスト計画
- **テスト種別**: 単体テスト
- **目的と範囲**: `ui.js`内のUI更新に関する関数が、`state`オブジェクトの状態に基づいてDOMを正しく構築・更新することを検証する。`state.js`や`firebase.js`などの外部モジュールはモックし、UIロジックの単体動作に集中する。
- **テスト対象**: `renderPapers`, `updateFilterButtons`, `openNoteEditor`, `closeNoteEditor`, `openEditModal`, `closeEditModal`, `showToast`

### 2. テスト設計
| テストの具体的な内容 | 操作手順 | 期待結果 |
| :--- | :--- | :--- |
| **renderPapers** | | |
| 論文データが0件の場合、空の状態が表示される | 1. `state.papers`を空配列に設定<br>2. `renderPapers`を実行 | `papersContainer`に`emptyState`要素が追加され、`hidden`クラスが除去される |
| 論文データが存在する場合、論文カードが描画される | 1. `state.papers`に複数の論文オブジェクトを設定<br>2. `renderPapers`を実行 | `papersContainer`内に、論文の数だけ`.paper-card`要素が生成される |
| ステータスでフィルタリングされる | 1. `state.papers`に異なるステータスを持つ論文を設定<br>2. `state.currentStatusFilter`を`read`に設定<br>3. `renderPapers`を実行 | `status`が`read`の論文のみが描画される |
| カテゴリでフィルタリングされる | 1. `state.papers`に異なるカテゴリを持つ論文を設定<br>2. `state.currentCategoryFilter`を特定のカテゴリ名に設定<br>3. `renderPapers`を実行 | 指定されたカテゴリの論文のみが描画される |
| 発行年でソートされる | 1. `state.papers`に異なる発行年を持つ論文を設定<br>2. `state.sortOrder`を`publicationYear`に設定<br>3. `renderPapers`を実行 | 論文が発行年の降順で描画される |
| **updateFilterButtons** | | |
| `currentStatusFilter`が`all`の場合、"すべて"ボタンがアクティブになる | 1. `state.currentStatusFilter`を`all`に設定<br>2. `updateFilterButtons`を実行 | `filterAllBtn`に`activeClass`が設定され、他のボタンには`inactiveClass`が設定される |
| `currentStatusFilter`が`read`の場合、"既読"ボタンがアクティブになる | 1. `state.currentStatusFilter`を`read`に設定<br>2. `updateFilterButtons`を実行 | `filterReadBtn`に`activeClass`が設定され、他のボタンには`inactiveClass`が設定される |
| **Modals & Toast** | | |
| `openNoteEditor`でメモ編集モーダルが開く | 1. `state.papers`に論文データを設定<br>2. `openNoteEditor`を論文IDで実行 | `noteModal`が表示状態になり、タイトルとエディタに論文の情報が設定される |
| `closeNoteEditor`でメモ編集モーダルが閉じる | 1. `noteModal`を表示状態にする<br>2. `closeNoteEditor`を実行 | `noteModal`が非表示状態になる |
| `openEditModal`で論文編集モーダルが開く | 1. `state.papers`に論文データを設定<br>2. `openEditModal`を論文IDで実行 | `editModal`が表示状態になり、各入力フィールドに論文の情報が設定される |
| `closeEditModal`で論文編集モーダルが閉じる | 1. `editModal`を表示状態にする<br>2. `closeEditModal`を実行 | `editModal`が非表示状態になる |
| `showToast`でトーストが表示され、時間経過で消える | 1. `showToast`を実行<br>2. 3秒待機する | 1. `toast`要素に`show`クラスとメッセージが表示される<br>2. `toast`要素から`show`クラスが除去される |

---

## `stats.js`: 単体テスト

### 1. テスト計画
- **テスト種別**: 単体テスト
- **目的と範囲**: `stats.js`内の各統計関数が、通常のデータ、空のデータ、不正なデータに対して正しく動作することを検証する。
- **テスト対象**: `calculateStatusCounts`, `calculateYearCounts`, `calculateTopAuthors`, `calculateTopCategories`

### 2. テスト設計
| テストの具体的な内容 | 操作手順 | 期待結果 |
| :--- | :--- | :--- |
| **正常系** | | |
| `calculateStatusCounts`がステータス毎の件数を正しく集計する | 論文データを引数に`calculateStatusCounts`を実行 | `{ read: 2, unread: 1 }`のような形式で正しい件数が返される |
| `calculateYearCounts`が発行年毎の件数を正しく集計する | 論文データを引数に`calculateYearCounts`を実行 | `{ '2023': 2, '2022': 1 }`のような形式で正しい件数が返される |
| `calculateTopAuthors`が上位の著者を正しく集計・ソートする | 論文データを引数に`calculateTopAuthors`を実行 | `[{ name: 'Author A', count: 3 }, ...]`の形式で、件数の降順にソートされた配列が返される |
| `calculateTopCategories`が上位のカテゴリを正しく集計・ソートする | 論文データを引数に`calculateTopCategories`を実行 | `[{ name: 'Category A', count: 3 }, ...]`の形式で、件数の降順にソートされた配列が返される |
| **異常系・エッジケース** | | |
| 論文データが空配列の場合、全ての関数が空の結果を返す | 空の配列を引数に各関数を実行 | `calculateStatusCounts`と`calculateYearCounts`は`{}`を、`calculateTopAuthors`と`calculateTopCategories`は`[]`を返す |
| `year`や`category`が未定義の論文データがあってもエラーにならない | `year`や`category`が`undefined`や`null`の論文を含むデータを引数に各関数を実行 | エラーが発生せず、`undefined`や`null`のデータは無視して集計される |
| `authors`が空配列または未定義の論文データがあってもエラーにならない | `authors`が空配列や`undefined`の論文を含むデータを引数に`calculateTopAuthors`を実行 | エラーが発生せず、該当の論文は著者集計から無視される |

---

## 結合テスト: データフロー検証

### 1. テスト計画
- **テスト種別**: 結合テスト
- **目的と範囲**:
    - 目的: アプリケーションの主要なデータフローである「データ取得 → 状態更新 → UI描画」の連携が正しく行われることを検証する。
    - 範囲: `firebase.js`のデータリスニングから、`state.js`による状態更新を経て、`ui.js`がUIを再描画するまでの一連の流れを対象とする。Firebaseとの実際の通信はモック化する。
- **テスト対象**:
    - `firebase.js` (`startDataListening`)
    - `state.js` (`updateState`)
    - `ui.js` (`renderPapers`)

### 2. テスト設計
| テストの具体的な内容 | 操作手順 | 期待結果 |
| :--- | :--- | :--- |
| Firestoreのデータ変更がUIに反映される | 1. `firebase.js`の`onSnapshot`コールバックをトリガーする。<br>2. テスト用の論文データを渡す。 | 1. `state.js`の`updateState`が、渡された論文データで呼び出されること。<br>2. `updateState`が呼び出された後、`ui.js`の`renderPapers`が呼び出されること。 |

---

## 結合テスト: フィルタリング機能

### 1. テスト計画
- **テスト種別**: 結合テスト
- **目的と範囲**: 論文リストのステータスフィルター機能が正しく動作することを検証する。フィルターボタンのクリックから、状態の更新、UIの再描画までの一連の流れを対象とする。
- **テスト対象**:
    - `script.js` (イベントリスナー部分)
    - `state.js` (`updateState`)
    - `ui.js` (`renderPapers`, `updateFilterButtons`)

### 2. テスト設計
| テストの具体的な内容 | 操作手順 | 期待結果 |
| :--- | :--- | :--- |
| 「既読」フィルターボタンをクリックすると、既読の論文のみが表示される | 1. 複数のステータス（'read', 'unread'）を持つ論文を準備する。<br>2. `renderPapers` を実行し、初期表示を行う。<br>3. 「既読」フィルターボタン（`#filter-read`）をクリックする。 | 1. `state.updateState` が `{ currentStatusFilter: 'read' }` を引数に呼び出されること。<br>2. `ui.renderPapers` が再実行されること。<br>3. `ui.updateFilterButtons` が実行され、「既読」ボタンがアクティブになること。<br>4. 論文リストのDOMに、`status: 'read'` の論文のみが表示されていること。 |
| 「すべて」フィルターボタンをクリックすると、すべての論文が表示される | 1. 複数のステータスを持つ論文を準備する。<br>2. いずれかのフィルター（例：「既読」）がアクティブな状態にする。<br>3. 「すべて」フィルターボタン（`#filter-all`）をクリックする。 | 1. `state.updateState` が `{ currentStatusFilter: 'all' }` を引数に呼び出されること。<br>2. 論文リストのDOMに、すべての論文が表示されていること。 |