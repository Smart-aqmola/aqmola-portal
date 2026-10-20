import { describe, expect, it } from "vitest";
import { locales } from "@/shared/i18n/config";
import { categories } from "./categories";
import { organizations } from "./organizations";
import { services } from "./services";
import { situations } from "./situations";
import { territories } from "./territories";
import { sectors, situationIds } from "../domain/types";

describe("catalog test data", () => {
  it("has unique ids and slugs", () => {
    for (const list of [territories, organizations, services]) {
      const ids = list.map((item) => item.id);
      expect(new Set(ids).size, "duplicate id").toBe(ids.length);
    }
    const slugs = services.map((service) => service.slug);
    expect(new Set(slugs).size, "duplicate slug").toBe(slugs.length);
  });

  it("uses URL-safe slugs", () => {
    for (const service of services) expect(service.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("links every service to a real organization and situation", () => {
    const organizationIds = new Set(organizations.map((item) => item.id));
    const situationIdSet = new Set<string>(situations.map((item) => item.id));
    for (const service of services) {
      expect(organizationIds.has(service.organizationId), service.slug).toBe(true);
      expect(situationIdSet.has(service.situationId), service.slug).toBe(true);
    }
  });

  it("links every organization only to real territories", () => {
    const territoryIds = new Set(territories.map((item) => item.id));
    for (const organization of organizations) {
      if (organization.territories === "all") continue;
      for (const id of organization.territories) {
        expect(territoryIds.has(id), `${organization.id}: ${id}`).toBe(true);
      }
    }
  });

  it("describes every situation and gives each at least 4 services", () => {
    expect(situations.map((item) => item.id)).toEqual([...situationIds]);
    for (const situation of situations) {
      const count = services.filter((service) => service.situationId === situation.id).length;
      expect(count, situation.id).toBeGreaterThanOrEqual(4);
    }
  });

  it("has audiences, a processing time and Russian text for every service", () => {
    for (const service of services) {
      expect(service.audiences.length, service.slug).toBeGreaterThan(0);
      expect(service.workingDays, service.slug).toBeGreaterThanOrEqual(1);
      expect(service.title.ru.trim(), service.slug).not.toBe("");
      expect(service.summary.ru.trim(), service.slug).not.toBe("");
    }
  });

  it("names every territory, organization and situation in all languages", () => {
    const named = [...territories, ...organizations, ...situations];
    for (const item of named) {
      for (const locale of locales) {
        expect(item.name[locale]?.trim(), `${item.id}:${locale}`).toBeTruthy();
      }
    }
  });

  it("keeps every territory reachable: each one has services from more than one organization", () => {
    for (const territory of territories) {
      const providers = organizations.filter(
        (org) => org.territories === "all" || org.territories.includes(territory.id),
      );
      expect(providers.length, territory.id).toBeGreaterThan(8);
    }
  });
});

describe("catalog test data: categories and service details", () => {
  it("defines one category per sector, named in all languages", () => {
    expect(categories.map((item) => item.id)).toEqual([...sectors]);
    for (const category of categories) {
      for (const locale of locales) {
        expect(category.name[locale]?.trim(), `${category.id}:${locale}`).toBeTruthy();
      }
    }
  });

  it("puts every service into the category of its organization, and every category has services", () => {
    const sectorOf = new Map(organizations.map((org) => [org.id, org.sector]));
    for (const service of services) {
      expect(service.categoryId, service.slug).toBe(sectorOf.get(service.organizationId));
    }
    for (const category of categories) {
      const count = services.filter((service) => service.categoryId === category.id).length;
      expect(count, category.id).toBeGreaterThan(0);
    }
  });

  it("gives every service a unique four-digit code", () => {
    const codes = services.map((service) => service.code);
    for (const code of codes) expect(code).toMatch(/^\d{4}$/);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("marks some services as popular and some as new, but not all", () => {
    const popular = services.filter((service) => service.popular).length;
    const fresh = services.filter((service) => service.isNew).length;
    expect(popular).toBeGreaterThanOrEqual(6);
    expect(popular).toBeLessThan(services.length / 2);
    expect(fresh).toBeGreaterThanOrEqual(2);
    expect(fresh).toBeLessThan(services.length / 4);
  });

  it("has a valid channel, working days and update date", () => {
    for (const service of services) {
      expect(["online", "front-office"], service.slug).toContain(service.channel);
      expect(Number.isInteger(service.workingDays), service.slug).toBe(true);
      expect(service.updatedAt, service.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(service.updatedAt)), service.slug).toBe(false);
    }
  });

  it("keeps most services online but has some that need a visit", () => {
    const visits = services.filter((service) => service.channel === "front-office").length;
    expect(visits).toBeGreaterThanOrEqual(3);
    expect(visits).toBeLessThan(services.length / 3);
  });

  it("gives official long names only where they add information", () => {
    const withFullTitle = services.filter((service) => service.fullTitle);
    expect(withFullTitle.length).toBeGreaterThanOrEqual(5);
    for (const service of withFullTitle) {
      expect(service.fullTitle!.ru.length, service.slug).toBeGreaterThan(service.title.ru.length);
    }
  });

  it("keeps card titles short", () => {
    for (const service of services) {
      expect(service.title.ru.length, service.slug).toBeLessThanOrEqual(80);
    }
  });
});
