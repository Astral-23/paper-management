import { describe, it, expect, beforeEach } from 'vitest';
import { state, updateState } from '../js/state.js';

// stateはモジュール間で共有されるため、テストごとに初期状態に戻す
const initialState = JSON.parse(JSON.stringify(state));
beforeEach(() => {
    Object.keys(state).forEach(key => delete state[key]);
    Object.assign(state, JSON.parse(JSON.stringify(initialState)));
});

describe('updateState', () => {
    it('新しいプロパティをstateに追加できる', () => {
        const newState = { newProp: 'testValue' };
        updateState(newState);
        expect(state.newProp).toBe('testValue');
    });

    it('既存のプロパティを更新できる', () => {
        const newFilter = 'read';
        updateState({ currentStatusFilter: newFilter });
        expect(state.currentStatusFilter).toBe(newFilter);
    });

    it('複数のプロパティを一度に更新できる', () => {
        const updates = {
            currentStatusFilter: 'skimmed',
            sortOrder: 'title'
        };
        updateState(updates);
        expect(state.currentStatusFilter).toBe('skimmed');
        expect(state.sortOrder).toBe('title');
    });

    it('他のプロパティに影響を与えずに更新する', () => {
        const initialSortOrder = state.sortOrder;
        updateState({ currentStatusFilter: 'to-read' });
        expect(state.sortOrder).toBe(initialSortOrder);
    });
});
