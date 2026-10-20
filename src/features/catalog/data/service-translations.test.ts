import { describe, expect, it } from "vitest";
import { serviceTranslations } from "./service-translations";
import { services } from "./services";

describe("service translations", () => {
  it("covers every service and nothing else", () => {
    expect(Object.keys(serviceTranslations).toSorted()).toEqual(
      services.map((service) => service.slug).toSorted(),
    );
  });

  it("gives every service a Kazakh and an English title and summary", () => {
    for (const service of services) {
      for (const lang of ["kk", "en"] as const) {
        const title = service.title[lang]?.trim();
        const summary = service.summary[lang]?.trim();
        expect(title, `${service.slug} ${lang} title`).toBeTruthy();
        expect(summary, `${service.slug} ${lang} summary`).toBeTruthy();
        expect(title, `${service.slug} ${lang} title is not Russian`).not.toBe(service.title.ru);
      }
    }
  });

  it("translates the long official title wherever Russian has one", () => {
    for (const service of services) {
      if (!service.fullTitle) continue;
      expect(service.fullTitle.kk?.trim(), service.slug).toBeTruthy();
      expect(service.fullTitle.en?.trim(), service.slug).toBeTruthy();
    }
  });

  it("writes Kazakh in Cyrillic and English without Cyrillic", () => {
    for (const service of services) {
      expect(service.title.kk, service.slug).toMatch(/[Ѐ-ӿ]/);
      expect(service.title.en, service.slug).not.toMatch(/[Ѐ-ӿ]/);
      expect(service.summary.en, service.slug).not.toMatch(/[Ѐ-ӿ]/);
    }
  });
});
