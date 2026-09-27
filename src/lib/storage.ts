/** localStorage wrapper with in-memory fallback (private mode). */

let available = true;
try {
  const k = '__bb_test__';
  window.localStorage.setItem(k, '1');
  window.localStorage.removeItem(k);
} catch {
  available = false;
}

const mem = new Map<string, string>();

export const storageAvailable = available;

export function getItem(key: string): string | null {
  try {
    if (available) return window.localStorage.getItem(key);
    return mem.get(key) ?? null;
  } catch {
    return mem.get(key) ?? null;
  }
}

export function setItem(key: string, value: string): void {
  try {
    if (available) window.localStorage.setItem(key, value);
    else mem.set(key, value);
  } catch {
    mem.set(key, value);
  }
}

export function removeItem(key: string): void {
  try {
    if (available) window.localStorage.removeItem(key);
    else mem.delete(key);
  } catch {
    mem.delete(key);
  }
}

export function listKeys(prefix: string): string[] {
  try {
    if (available) {
      const out: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) out.push(k);
      }
      return out;
    }
  } catch {
    /* fall through */
  }
  return [...mem.keys()].filter((k) => k.startsWith(prefix));
}
