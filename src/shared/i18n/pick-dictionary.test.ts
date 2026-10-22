import { describe, expect, it } from "vitest";
import { getDictionary } from "./get-dictionary";
import { pickDictionary } from "./pick-dictionary";

describe("pickDictionary", () => {
  it("keeps only the asked parts", async () => {
    const dict = await getDictionary("ru");
    const part = pickDictionary(dict, "brand", "nav");
    expect(Object.keys(part)).toEqual(["brand", "nav"]);
    expect(part.nav).toBe(dict.nav);
  });
});
