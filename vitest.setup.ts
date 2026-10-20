import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Auto-cleanup only registers when Vitest globals are enabled; we keep them off.
afterEach(() => {
  cleanup();
});
