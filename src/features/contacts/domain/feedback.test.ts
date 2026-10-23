import { describe, expect, it } from "vitest";
import {
  createFeedback,
  emptyFeedback,
  nextFeedbackNumber,
  parseFeedback,
  validateFeedback,
  type FeedbackForm,
} from "./feedback";

const filled = (patch: Partial<FeedbackForm> = {}): FeedbackForm => ({
  ...emptyFeedback(),
  name: "Айгерим",
  phone: "8 705 555 12 34",
  comment: "Когда начнут принимать показания онлайн?",
  consent: true,
  ...patch,
});

describe("validateFeedback", () => {
  it("names every missing field of an empty form", () => {
    expect(validateFeedback(emptyFeedback())).toEqual({
      name: "required",
      phone: "required",
      comment: "required",
      consent: "required",
    });
  });

  it("checks the phone, the length of the question and the consent", () => {
    expect(validateFeedback(filled())).toEqual({});
    expect(validateFeedback(filled({ phone: "12345" })).phone).toBe("format");
    expect(validateFeedback(filled({ comment: "ой" })).comment).toBe("short");
    expect(validateFeedback(filled({ comment: "a".repeat(1001) })).comment).toBe("long");
    expect(validateFeedback(filled({ name: "   " })).name).toBe("required");
  });
});

describe("createFeedback", () => {
  it("keeps the cleaned form, the number and the time", () => {
    const now = new Date("2026-10-23T06:00:00Z");
    const number = nextFeedbackNumber([], now);
    const item = createFeedback(filled({ name: "  Айгерим " }), { id: "f-1", number }, now);
    expect(item).toMatchObject({
      number: "DEMO-FB-2026-00001",
      name: "Айгерим",
      phone: "+77055551234",
      topic: "question",
      createdAt: now.toISOString(),
    });
    expect(nextFeedbackNumber([item], now)).toBe("DEMO-FB-2026-00002");
    expect(parseFeedback(JSON.stringify([item, { id: 1 }]))).toEqual([item]);
  });
});
