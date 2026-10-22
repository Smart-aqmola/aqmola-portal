import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Auto-cleanup only registers when Vitest globals are enabled; we keep them off.
afterEach(() => {
  cleanup();
  // A form draft left by one test must not fill the form of the next one.
  if (typeof window !== "undefined") window.sessionStorage.clear();
});
