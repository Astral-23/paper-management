export const state = {
    currentEditingPaperId: null,
    papers: [],
    currentStatusFilter: 'all',
    currentCategoryFilter: 'all',
    sortOrder: 'publicationYear',
    initialLoad: true,
    charts: {},
    STATUS_CYCLE: ['unread', 'to-read', 'skimmed', 'read']
};

export function updateState(newState) {
    Object.assign(state, newState);
}
