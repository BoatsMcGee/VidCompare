/**
 * Vitest setup (runs before each test file).
 *
 * Node >= 23 defines a global `localStorage` getter that returns a stub
 * without Storage methods, shadowing jsdom's real implementation.
 * Replace it with an in-memory Storage so component tests that persist
 * state (e.g. presets) behave like the browser.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(String(key), String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

if (typeof globalThis.localStorage?.getItem !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    enumerable: true,
    writable: true,
  });
}
