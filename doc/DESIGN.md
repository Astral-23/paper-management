# 論文管理システム 設計書

*（この設計書は、開発の進行に合わせて逐次更新されるリビングドキュメントです）*

## 1. 概要

本システムは、論文の閲覧活動を記録、管理、可視化するためのWebアプリケーションである。Firebaseをバックエンドとして利用し、バニラJavaScriptによるモジュールベースのフロントエンドで構築されている。

## 2. アーキテクチャ

### 2.1. 使用技術
- **フロントエンド:**
    - **言語:** JavaScript (ES Modules)
    - **スタイリング:** Tailwind CSS, カスタムCSS
    - **ライブラリ:** `marked` (Markdown), `katex` (数式), `chart.js` (グラフ)
- **バックエンド (BaaS):** Firebase
    - `Firestore`: 論文データストア
    - `Firebase Authentication`: 管理者認証
- **外部サービス:** Semantic Scholar API (論文メタデータ取得)

### 2.2. データフロー

本アプリケーションは、状態管理を一元化し、データの流れを単一方向に保つことを目指す。

1.  **データ取得:** `firebase.js`の`startDataListening`がFirestoreの論文コレクションをリアルタイムで監視する。
2.  **状態更新:** データが変更されると、`state.js`の`updateState({ papers: newPapers })`が呼び出され、アプリケーションのグローバル状態が更新される。
3.  **UI再描画:** 状態更新後、`renderPapers()`や`renderOtherPage()`といった`ui.js`や`stats.js`内の描画関数が呼び出され、画面が最新の状態に更新される。
4.  **ユーザー操作:** ユーザーによる操作（例: 論文ステータスの変更）は、イベントリスナーから`firebase.js`内の対応する関数（例: `changePaperStatus`）を呼び出す。これによりFirestoreのデータが更新され、1.のリアルタイムリスナーが変更を検知して再びUIが更新される、というサイクルになる。

### 2.3. 状態管理 (`state.js`)

- アプリケーションの状態は、`state.js`内の`state`オブジェクトに集約される。
- `state`オブジェクトの直接の変更は禁止し、必ず`updateState(newState)`関数を通して更新する。これにより、状態の変更箇所を特定しやすくなる。

## 3. ファイル構成とモジュールの責務

```
/
├── index.html     # メインHTML
├── script.js      # アプリケーションのエントリーポイント
├── style.css      # カスタムスタイル
└── js/
    ├── api.js         # 外部API関連
    ├── config.js      # 定数管理
    ├── dom.js         # DOM要素の集約
    ├── firebase.js    # Firebase関連
    ├── state.js       # 状態管理
    ├── stats.js       # 統計機能
    └── theme.js       # テーマ機能
    └── ui.js          # UI描画・操作
```

### `script.js` (エントリーポイント)
- **責務:** アプリケーションの起動シーケンスを管理する。
- **主な処理:**
    - 各モジュールから初期化関数をインポートする。
    - `DOMContentLoaded`イベントで、`initializeTheme`, `startDataListening`などを呼び出す。
    - グローバルなイベントリスナー（フィルターボタンなど）を設定する。

### `dom.js`
- **責務:** DOM要素への参照をすべて集約する。
- **主な処理:** `document.getElementById`や`querySelectorAll`を使い、HTML要素を取得して`export`する。これにより、HTMLの構造変更に強くなる。

### `state.js`
- **責務:** アプリケーション全体の共有状態を一元管理する。
- **エクスポート:**
    - `state`: 論文リスト`papers`、フィルター状態`currentStatusFilter`などを含むオブジェクト。
    - `updateState(newState)`: `state`オブジェクトを安全に更新するための唯一のインターフェース。

### `firebase.js`
- **責務:** Firebase (Firestore, Auth) とのすべての通信を担う。
- **主な関数 (予定):**
    - `startDataListening()`: 論文データのリアルタイム監視を開始する。
    - `addPaper(paperData)`: 新規論文をFirestoreに追加する。
    - `updatePaper(paperId, updateData)`: 論文情報を更新する。
    - `deletePaper(paperId)`: 論文を削除する。
    - `signIn(email, password)`: ログイン処理。
    - `signOut()`: ログアウト処理。
    - `onAuthChange(callback)`: 認証状態の変更を監視する。

### `api.js`
- **責務:** Semantic Scholar APIとの通信を担う。
- **主な関数 (予定):**
    - `fetchPaperDataByArxivId(arxivId)`
    - `searchAndFetchPaperDataByQuery(query)`

### `ui.js`
- **責務:** DOMの描画と更新、UIコンポーネントの操作を担う。
- **主な関数:**
    - `renderPapers()`: 論文リストを描画する。
    - `openNoteEditor(paperId)`, `closeNoteEditor()`: メモ編集モーダルの表示・非表示。
    - `openEditModal(paperId)`, `closeEditModal()`: 論文編集モーダルの表示・非表示。
    - `showToast(message, type)`: トースト通知を表示する。
    - `updateFilterButtons()`: フィルターボタンの選択状態を更新する。

### `stats.js`
- **責務:** 統計データの計算とグラフの描画を担う。
- **主な関数 (予定):**
    - `renderOtherPage()`: 「その他」ページ全体の描画を統括する。
    - `renderKeyAchievements()`: 主要実績を計算・描画する。
    - `renderDetailedStats()`: 詳細な統計グラフを計算・描画する。
    - `renderContributionGraph()`: コントリビューショングラフを描画する。

### `theme.js`
- **責務:** テーマ切り替え機能を提供する。
- **主な関数:**
    - `initializeTheme()`: テーマ切り替えのイベントリスナーを設定し、`localStorage`から保存されたテーマを適用する。

### `config.js`
- **責務:** アプリケーション全体で使用する定数を管理する。
- **主な内容 (予定):**
    - `ARXIV_ID_REGEX`: arXiv IDを検出するための正規表現。
    - `STATUS_CYCLE`: 論文ステータスの遷移順を定義した配列。