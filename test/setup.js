import { vi } from 'vitest';

// onSnapshotのモック。コールバックをグローバルに保持してテストから制御できるようにする
const onSnapshot = vi.fn((onNext, onError) => {
    global.mockOnSnapshotCallback = onNext;
    global.mockOnSnapshotErrorCallback = onError;
    return vi.fn(); // unsubscribe関数
});

// firestoreのモック。firestoreは関数(firebase.firestore())であり、
// 静的プロパティ(firebase.firestore.FieldValue)も持つため、複雑なモックが必要。
const firestoreMock = vi.fn(() => ({
    collection: vi.fn(() => ({
        orderBy: vi.fn(() => ({
            onSnapshot: onSnapshot,
        })),
    })),
}));
firestoreMock.FieldValue = {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
    delete: vi.fn(() => 'DELETE_FIELD'),
};

// グローバルなfirebaseオブジェクトをモックする
global.firebase = {
    auth: vi.fn(() => ({
        onAuthStateChanged: vi.fn(() => vi.fn()),
    })),
    firestore: firestoreMock,
};

// 他のモジュールでimportされる可能性のあるFirebaseモジュールもモックしておく
// vi.mockは自動的にファイルの先頭に巻き上げられる
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/firestore', async () => {
    const original = await vi.importActual('firebase/firestore');
    return {
        ...original,
        getFirestore: vi.fn(() => ({})),
        collection: vi.fn(() => ({})),
        query: vi.fn(() => ({})),
        orderBy: vi.fn(() => ({})),
        onSnapshot: onSnapshot, // グローバルモックと同一の関数を使い回す
    };
});

// marked.js と marked-katex のグローバルモック
// これらは index.html で読み込まれるライブラリ
global.marked = {
    use: vi.fn(),
    parse: vi.fn(content => content || ''), // 渡されたコンテンツをそのまま返す簡単なモック
};

global.markedKatex = vi.fn();