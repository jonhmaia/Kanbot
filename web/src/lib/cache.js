const PREFIX = 'kanbot:';
const memory = new Map();

export function cacheGet(key) {
  if (memory.has(key)) return memory.get(key);
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const value = JSON.parse(raw);
    memory.set(key, value);
    return value;
  } catch {
    return null;
  }
}

export function cacheSet(key, value) {
  memory.set(key, value);
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
  return value;
}

export function cacheRemovePrefix(prefix) {
  for (const key of [...memory.keys()]) {
    if (key === prefix || key.startsWith(prefix)) memory.delete(key);
  }
  try {
    Object.keys(sessionStorage)
      .filter((k) => k === PREFIX + prefix || k.startsWith(PREFIX + prefix))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function cacheInvalidateWorkspace() {
  cacheRemovePrefix('dashboard');
  cacheRemovePrefix('tasks');
  cacheRemovePrefix('master-board');
  cacheRemovePrefix('board:');
  cacheRemovePrefix('all-columns');
}

export function cacheClear() {
  memory.clear();
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
