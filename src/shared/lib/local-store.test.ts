import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_FAILED_EVENT, createLocalStore } from "./local-store";

const parse = (raw: string | null): string[] => (raw ? (JSON.parse(raw) as string[]) : []);

describe("createLocalStore", () => {
  beforeEach(() => window.localStorage.clear());

  it("returns the same object until the stored text changes", () => {
    window.localStorage.setItem("k", '["a"]');
    const store = createLocalStore({ key: "k", parse, empty: [] });
    expect(store.getSnapshot()).toBe(store.getSnapshot());
    expect(store.getSnapshot()).toEqual(["a"]);
  });

  it("writes, notifies subscribers and can clear the value", () => {
    const store = createLocalStore({ key: "k2", parse, empty: [] as string[] });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.write(["x"]);
    expect(store.getSnapshot()).toEqual(["x"]);
    expect(listener).toHaveBeenCalledTimes(1);
    store.write(null);
    expect(store.getSnapshot()).toEqual([]);
    unsubscribe();
    store.write(["y"]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("keeps the value in memory when storage refuses to save", () => {
    const store = createLocalStore({ key: "k3", parse, empty: [] as string[] });
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const failed = vi.fn();
    window.addEventListener(STORAGE_FAILED_EVENT, failed);
    store.write(["kept"]);
    expect(store.getSnapshot()).toEqual(["kept"]);
    expect(failed).toHaveBeenCalledTimes(1);
    window.removeEventListener(STORAGE_FAILED_EVENT, failed);
    spy.mockRestore();
  });

  it("gives the empty value on the server", () => {
    const empty: string[] = [];
    expect(createLocalStore({ key: "k4", parse, empty }).getServerSnapshot()).toBe(empty);
  });
});
