const KEY = 'justchat_messages';
const ONE_HOUR = 60 * 60 * 1000;

export function saveMessages(roomCode, messages) {
  localStorage.setItem(KEY, JSON.stringify({
    roomCode,
    messages,
    savedAt: Date.now()
  }));
}

export function syncSavedMessages(roomCode, messages) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.roomCode !== roomCode) return;
    localStorage.setItem(
      KEY,
      JSON.stringify({
        ...data,
        messages,
      }),
    );
  } catch {
    // Ignore corrupted storage and let the app continue.
  }
}

export function loadMessages(roomCode) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const age = Date.now() - data.savedAt;
    if (data.roomCode !== roomCode || age > ONE_HOUR) {
      clearMessages();
      return [];
    }
    return data.messages;
  } catch {
    return [];
  }
}

export function clearMessages() {
  localStorage.removeItem(KEY);
}

export function isSaved() {
  return !!localStorage.getItem(KEY);
}

export function getTimeLeft() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const ms = ONE_HOUR - (Date.now() - data.savedAt);
    if (ms <= 0) { clearMessages(); return null; }
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s}s`;
  } catch {
    return null;
  }
}
