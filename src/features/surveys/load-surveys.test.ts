import { describe, expect, it } from "vitest";
import { loadSurvey, loadSurveys } from "./load-surveys";

const now = new Date("2026-10-23T06:00:00Z");

describe("loadSurveys", () => {
  it("splits open and finished surveys and picks the popular open ones", async () => {
    const page = await loadSurveys("ru", {}, now);
    expect(page.open.length).toBeGreaterThan(2);
    expect(page.finished.length).toBe(1);
    expect(page.finished[0].left).toBeNull();
    expect(page.popular.every((item) => item.popular && item.open)).toBe(true);
    expect(page.open.every((item) => item.left !== null)).toBe(true);
  });

  it("narrows to a category from the address and ignores an unknown one", async () => {
    const page = await loadSurveys("kk", { category: "ecology" }, now);
    expect(page.category).toBe("ecology");
    expect([...page.open, ...page.finished].every((item) => item.category === "ecology")).toBe(
      true,
    );
    expect((await loadSurveys("ru", { category: "space" }, now)).category).toBeUndefined();
  });
});

describe("loadSurvey", () => {
  it("returns the questions in the language of the page and other open surveys", async () => {
    const page = await loadSurvey("en", "heating-season", now);
    expect(page?.survey.questions[0].text).toBe("Did your home get heat on time?");
    expect(page?.survey.paragraphs.length).toBe(2);
    expect(page?.others.some((item) => item.slug === "heating-season")).toBe(false);
    expect(page?.others.every((item) => item.open)).toBe(true);
    expect(await loadSurvey("ru", "nothing", now)).toBeNull();
  });
});
