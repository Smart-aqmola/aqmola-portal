type Options<T> = {
  key: string;
  /** Turns the stored text into a value. Must never throw and must return `empty` for bad input. */
  parse: (raw: string | null) => T;
  empty: T;
};

/**
 * A value kept in localStorage that React can subscribe to with `useSyncExternalStore`.
 * Falls back to memory when the browser refuses to store data (for example in a private window).
 */
export function createLocalStore<T>({ key, parse, empty }: Options<T>) {
  const listeners = new Set<() => void>();
  let lastRaw: string | null | undefined;
  let lastValue: T = empty;
  let memory: { value: T } | null = null;

  function readStorage(): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /** The value must be the same object until the stored text changes, or React re-renders forever. */
  function getSnapshot(): T {
    if (memory) return memory.value;
    const raw = readStorage();
    if (raw !== lastRaw) {
      lastRaw = raw;
      lastValue = parse(raw);
    }
    return lastValue;
  }

  function getServerSnapshot(): T {
    return empty;
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  }

  function write(value: T | null) {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(value));
      memory = null;
    } catch {
      memory = { value: value ?? empty };
    }
    for (const listener of listeners) listener();
  }

  return { getSnapshot, getServerSnapshot, subscribe, write };
}
