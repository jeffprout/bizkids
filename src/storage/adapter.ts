/**
 * The ONLY place that touches a storage backend.
 *
 * Web uses localStorage today. When the app is wrapped with Capacitor for iOS,
 * swap the implementation here for Capacitor Preferences and nothing else in
 * the app changes. Components must never call localStorage directly.
 */
export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

const memory = new Map<string, string>();

const memoryAdapter: StorageAdapter = {
  async get(key) {
    return memory.get(key) ?? null;
  },
  async set(key, value) {
    memory.set(key, value);
  },
  async remove(key) {
    memory.delete(key);
  },
  async keys() {
    return [...memory.keys()];
  },
};

const localStorageAdapter: StorageAdapter = {
  async get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Private browsing or a full quota. The game keeps playing in memory.
      memory.set(key, value);
    }
  },
  async remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      memory.delete(key);
    }
  },
  async keys() {
    try {
      return Object.keys(window.localStorage);
    } catch {
      return [...memory.keys()];
    }
  },
};

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

export const storage: StorageAdapter = hasLocalStorage() ? localStorageAdapter : memoryAdapter;
