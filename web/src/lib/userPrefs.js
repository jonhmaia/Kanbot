let prefUserId = null;

export function setPrefUser(userId) {
  prefUserId = userId || null;
  return prefUserId;
}

export function getPrefUser() {
  return prefUserId;
}

export function prefKey(base) {
  return prefUserId ? base + ':' + prefUserId : base;
}

export function readLocal(base, fallback = null) {
  try {
    const scoped = prefKey(base);
    const raw = localStorage.getItem(scoped);
    if (raw != null) return raw;
    if (scoped !== base) {
      const legacy = localStorage.getItem(base);
      if (legacy != null) return legacy;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal(base, value) {
  try {
    const key = prefKey(base);
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, typeof value === 'string' ? value : String(value));
  } catch {
    /* quota / private mode */
  }
}

export function readLocalJson(base, fallback) {
  const raw = readLocal(base);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeLocalJson(base, value) {
  try {
    writeLocal(base, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
  return value;
}
