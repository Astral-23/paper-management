import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Mock a global firebase object
const mockOnSnapshot = vi.fn();
const mockDoc = vi.fn((id) => ({
    id,
    delete: vi.fn(() => Promise.resolve()),
    update: vi.fn((data) => Promise.resolve(data)),
}));
const mockCollection = vi.fn(() => ({
    orderBy: vi.fn(() => ({
        onSnapshot: mockOnSnapshot,
    })),
    doc: mockDoc,
    add: vi.fn((data) => Promise.resolve({ id: 'new-id', ...data })),
}));

const mockAuth = {
    setPersistence: vi.fn(() => Promise.resolve()),
    signInWithEmailAndPassword: vi.fn(() => Promise.resolve({ user: { uid: 'test-uid' } })),
    signOut: vi.fn(() => Promise.resolve()),
    onAuthStateChanged: vi.fn(),
};

const mockFirestore = {
    collection: mockCollection,
    FieldValue: {
        serverTimestamp: vi.fn(() => 'mock-timestamp'),
        delete: vi.fn(() => 'mock-delete-value'),
    },
};

const mockFirebase = {
    auth: Object.assign(() => mockAuth, {
        Auth: {
            Persistence: {
                LOCAL: 'local'
            }
        }
    }),
    firestore: () => mockFirestore,
};

vi.stubGlobal('firebase', mockFirebase);

// state.jsもモックする
vi.mock('../js/state.js', () => ({
    state: {
        papers: [],
        initialLoad: true,
        STATUS_CYCLE: ['unread', 'to-read', 'skimmed', 'read'],
    },
    updateState: vi.fn(),
}));

// firebase.jsとstate.jsを動的にインポートするための準備
let firebase_module;
let state_module;

beforeAll(async () => {
    firebase_module = await import('../js/firebase.js');
    state_module = await import('../js/state.js');
});

beforeEach(() => {
    vi.clearAllMocks();
    // Reset state mock before each test
    state_module.state.papers = [];
    state_module.state.initialLoad = true;
});

describe('startDataListening', () => {
    it('Firestoreのリスナーをセットアップし、データ変更時にstateを更新する', () => {
        const { updateState } = state_module;
        const onDataChange = vi.fn();
        const onError = vi.fn();

        firebase_module.startDataListening(onDataChange, onError);

        // onSnapshotのコールバックを取得
        const snapshotCallback = mockOnSnapshot.mock.calls[0][0];

        const mockSnapshot = {
            docs: [
                { id: '1', data: () => ({ title: 'Paper 1', read: true }) }, // 古いデータ形式
                { id: '2', data: () => ({ title: 'Paper 2', status: 'unread' }) },
            ],
        };

        snapshotCallback(mockSnapshot);

        expect(updateState).toHaveBeenCalledWith({ initialLoad: false });

        const expectedPapers = [
            { id: '1', title: 'Paper 1', read: true, status: 'read' },
            { id: '2', title: 'Paper 2', status: 'unread' },
        ];
        expect(updateState).toHaveBeenCalledWith({ papers: expectedPapers });
        expect(onDataChange).toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
    });

    it('データ取得中にエラーが発生した場合、onErrorコールバックを呼ぶ', () => {
        const { updateState } = state_module;
        const onDataChange = vi.fn();
        const onError = vi.fn();

        firebase_module.startDataListening(onDataChange, onError);

        // onSnapshotのエラーコールバックを取得
        const errorCallback = mockOnSnapshot.mock.calls[0][1];
        const mockError = new Error('Permission denied');

        errorCallback(mockError);

        expect(onError).toHaveBeenCalledWith(mockError);
        expect(onDataChange).not.toHaveBeenCalled();
        expect(updateState).not.toHaveBeenCalled();
    });
});
