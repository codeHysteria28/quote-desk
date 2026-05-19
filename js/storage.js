// Tiny localStorage wrapper for saved quotes.
const KEY = 'quotes.history.v1';
const MAX_ENTRIES = 50;

export function listQuotes() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

export function addQuote(entry) {
    const list = listQuotes();
    list.unshift({
        id: cryptoId(),
        savedAt: new Date().toISOString(),
        ...entry
    });
    const trimmed = list.slice(0, MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(trimmed));
    return trimmed[0];
}

export function clearQuotes() {
    localStorage.removeItem(KEY);
}

function cryptoId() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return 'q_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
