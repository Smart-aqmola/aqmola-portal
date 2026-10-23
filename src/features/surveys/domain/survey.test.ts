import { describe, expect, it } from "vitest";
import { isOpen, parseVotes, results, timeLeft, unanswered } from "./survey";
import type { Survey } from "./types";

const survey: Pick<Survey, "endsOn" | "questions"> = {
  endsOn: "2026-11-30",
  questions: [
    {
      id: "q1",
      kind: "single",
      text: { ru: "?" },
      options: [
        { id: "a", text: { ru: "a" }, votes: 1 },
        { id: "b", text: { ru: "b" }, votes: 1 },
        { id: "c", text: { ru: "c" }, votes: 1 },
      ],
    },
    {
      id: "q2",
      kind: "multiple",
      text: { ru: "?" },
      options: [
        { id: "x", text: { ru: "x" }, votes: 3 },
        { id: "y", text: { ru: "y" }, votes: 1 },
      ],
    },
  ],
};

const now = new Date("2026-10-23T06:00:00Z");

describe("time of a survey", () => {
  it("counts weeks when the end is far, days when it is near, and nothing when it is over", () => {
    expect(timeLeft(survey, now)).toEqual({ unit: "weeks", n: 5 });
    expect(timeLeft({ endsOn: "2026-10-25" }, now)).toEqual({ unit: "days", n: 3 });
    expect(timeLeft({ endsOn: "2026-10-23" }, now)).toEqual({ unit: "days", n: 1 });
    expect(timeLeft({ endsOn: "2026-10-22" }, now)).toBeNull();
    expect(isOpen({ endsOn: "2026-10-22" }, now)).toBe(false);
  });
});

describe("answers", () => {
  it("names every question without a valid answer", () => {
    expect(unanswered(survey, {})).toEqual(["q1", "q2"]);
    expect(unanswered(survey, { q1: ["a", "b"], q2: ["x"] })).toEqual(["q1"]);
    expect(unanswered(survey, { q1: ["zzz"], q2: ["x", "y"] })).toEqual(["q1"]);
    expect(unanswered(survey, { q1: ["a"], q2: ["x", "y"] })).toEqual([]);
  });
});

describe("results", () => {
  it("adds this browser's vote and keeps a single choice at exactly 100 %", () => {
    const [single, multiple] = results(survey, { q1: ["a"], q2: ["y"] });
    expect(single.total).toBe(4);
    expect(single.options.map((option) => option.percent)).toEqual([50, 25, 25]);
    expect(single.options[0].mine).toBe(true);

    const even = results({ questions: [survey.questions[0]] })[0];
    expect(even.options.reduce((sum, option) => sum + option.percent, 0)).toBe(100);
    expect(multiple.options.map((option) => option.votes)).toEqual([3, 2]);
  });

  it("keeps only sound votes from the browser", () => {
    const vote = { surveyId: "s-1", answers: { q1: ["a"] }, at: "2026-10-23T06:00:00Z" };
    expect(parseVotes(JSON.stringify([vote, { surveyId: 1 }, { ...vote, answers: [] }]))).toEqual([
      vote,
    ]);
  });
});
