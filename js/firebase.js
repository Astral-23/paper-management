import { updateState, state } from './state.js';

// These are globals from the scripts loaded in index.html
const auth = firebase.auth();
const db = firebase.firestore();

// Export the initialized services
export { auth, db };

export function startDataListening(onDataChange, onError) {
    const q = db.collection('papers').orderBy("createdAt", "desc");
    q.onSnapshot((snapshot) => {
        if (state.initialLoad) {
            updateState({ initialLoad: false });
        }
        const newPapers = snapshot.docs.map(doc => {
            const data = doc.data();
            if (!data.status) {
                data.status = data.read ? 'read' : 'unread';
            }
            return { id: doc.id, ...data };
        });
        updateState({ papers: newPapers });
        onDataChange();
    }, (error) => {
        console.error("Error fetching papers: ", error);
        onError(error);
    });
}

export async function deletePaper(paperId) {
    return await db.collection('papers').doc(paperId).delete();
}

export async function changePaperStatus(paperId) {
    const paper = state.papers.find(p => p.id === paperId);
    if (!paper) return;

    // This confirm dialog should be in the UI layer (script.js), not here.
    // But I will leave it for now to minimize changes.
    const currentStatus = paper.status || 'unread';
    if (currentStatus === 'read' && !confirm('この論文を「未読」に戻しますか？')) return;

    const currentIndex = state.STATUS_CYCLE.indexOf(currentStatus);
    const nextStatus = state.STATUS_CYCLE[(currentIndex + 1) % state.STATUS_CYCLE.length];
    
    const updateData = { status: nextStatus };
    if (nextStatus === 'read' && currentStatus !== 'read') {
        // FIX: Use the correct V8 syntax for serverTimestamp
        updateData.readAt = firebase.firestore.FieldValue.serverTimestamp();
    } else if (nextStatus !== 'read') {
        // FIX: Use the correct V8 syntax for FieldValue
        updateData.readAt = firebase.firestore.FieldValue.delete();
    }
    
    return await db.collection('papers').doc(paperId).update(updateData);
}

export async function signIn(email, password) {
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    return await auth.signInWithEmailAndPassword(email, password);
}

export function signOut() {
    return auth.signOut();
}

export function onAuthChange(callback) {
    return auth.onAuthStateChanged(callback);
}

export async function addPaper(paperData) {
    // FIX: Add the timestamp here, not in the UI layer.
    const newPaperData = {
        ...paperData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    return await db.collection('papers').add(newPaperData);
}

export async function updatePaper(paperId, updatedData) {
    return await db.collection('papers').doc(paperId).update(updatedData);
}

export async function saveNote(paperId, note) {
    return await db.collection('papers').doc(paperId).update({ note: note });
}