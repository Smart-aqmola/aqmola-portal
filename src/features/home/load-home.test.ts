import { describe, expect, it } from "vitest";
import { loadHome } from "./load-home";

describe("loadHome", () => {
  it("builds one group per life situation with three services each", async () => {
    const home = await loadHome("ru");
    expect(home.situations).toHaveLength(8);
    for (const group of home.situations) {
      expect(group.services, group.id).toHaveLength(3);
      expect(group.count, group.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("shows popular services first inside each group", async () => {
    const home = await loadHome("ru");
    const meters = home.situations.find((group) => group.id === "meters")!;
    expect(meters.services.every((service) => service.popular)).toBe(true);
    // "connection" has fewer than three popular services, so popular ones still come first.
    const connection = home.situations.find((group) => group.id === "connection")!;
    const flags = connection.services.map((service) => service.popular);
    expect(flags).toEqual([...flags].sort((a, b) => Number(b) - Number(a)));
  });

  it("describes a service card with everything the card shows", async () => {
    const [group] = (await loadHome("ru")).situations;
    const service = group.services[0];
    expect(service).toMatchObject({
      slug: expect.stringMatching(/^[a-z0-9-]+$/),
      code: expect.stringMatching(/^\d{4}$/),
      title: expect.any(String),
      summary: expect.any(String),
      organization: expect.any(String),
      free: true,
      workingDays: expect.any(Number),
      channel: expect.stringMatching(/^(online|front-office)$/),
      audience: expect.stringMatching(/^(resident|business|both)$/),
    });
  });

  it("translates situation names, service titles and organizations", async () => {
    const ru = await loadHome("ru");
    const kk = await loadHome("kk");
    expect(kk.situations[0].name).not.toBe(ru.situations[0].name);
    expect(kk.situations[0].services[0].title).not.toBe(ru.situations[0].services[0].title);
    expect(kk.situations[0].services[0].organization).not.toBe(
      ru.situations[0].services[0].organization,
    );
  });

  it("returns the three newest news items with the territory name", async () => {
    const { news } = await loadHome("ru");
    expect(news).toHaveLength(3);
    const dates = news.map((item) => item.date);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(news.find((item) => item.territory)?.territory).toMatch(/Кокшетау|район/);
  });

  it("returns the announced sections and the territories for the search form", async () => {
    const home = await loadHome("ru");
    expect(home.comingSoon).toHaveLength(4);
    expect(home.territories).toHaveLength(20);
    expect(home.territories[0]).toEqual({ id: "kokshetau", name: "Кокшетау" });
  });

  it("does not load places while tourism is off the home page", async () => {
    expect(await loadHome("ru")).not.toHaveProperty("places");
  });

  it("uses a large hero photo and lists each author once", async () => {
    const home = await loadHome("ru");
    expect(home.hero.url).toContain("/1920px-");
    expect(home.hero.credit.author).toBeTruthy();
    const sources = home.credits.map((credit) => credit.sourceUrl);
    expect(new Set(sources).size).toBe(sources.length);
    expect(sources).toContain(home.hero.credit.sourceUrl);
  });
});
