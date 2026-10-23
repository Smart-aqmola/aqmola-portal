import { describe, expect, it } from "vitest";
import { providerContacts } from "./data/contacts";
import { loadOperator, loadProviderContacts } from "./load-contacts";

describe("contacts", () => {
  it("gives the operator in the language of the page with a map link", () => {
    const ru = loadOperator("ru");
    expect(ru.address).toContain("Кокшетау");
    expect(loadOperator("kk").address).toContain("Көкшетау");
    expect(ru.mapHref).toMatch(/^https:\/\/www\.openstreetmap\.org\//);
    expect(ru.email.endsWith(".test")).toBe(true);
  });

  it("lists a desk for every provider that has one, and no made-up providers", async () => {
    const list = await loadProviderContacts("ru");
    expect(list).toHaveLength(Object.keys(providerContacts).length);
    expect(list.every((item) => item.name && item.phone && item.email)).toBe(true);
  });
});
