import { describe, expect, it } from "vitest";
import { allowedNextStatuses, canTransition, isFinal } from "./status";

describe("status rules", () => {
  it("lets a submitted application go to work or be rejected", () => {
    expect(allowedNextStatuses("submitted")).toEqual(["in_progress", "rejected"]);
  });

  it("lets an application in work be finished or rejected", () => {
    expect(allowedNextStatuses("in_progress")).toEqual(["done", "rejected"]);
  });

  it("allows nothing after a final status", () => {
    expect(allowedNextStatuses("done")).toEqual([]);
    expect(allowedNextStatuses("rejected")).toEqual([]);
    expect(isFinal("done")).toBe(true);
    expect(isFinal("submitted")).toBe(false);
  });

  it("does not skip a step or go back", () => {
    expect(canTransition("submitted", "done")).toBe(false);
    expect(canTransition("in_progress", "submitted")).toBe(false);
    expect(canTransition("submitted", "in_progress")).toBe(true);
  });
});
