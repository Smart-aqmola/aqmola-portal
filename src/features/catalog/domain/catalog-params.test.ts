import { describe, expect, it } from "vitest";
import { catalogHref, parseCatalogParams, toServiceQuery } from "./catalog-params";

const known = {
  territories: new Set(["kokshetau", "burabay"]),
  organizations: new Set(["akmola-water", "akmola-gas"]),
};

describe("parseCatalogParams", () => {
  it("uses safe defaults when there is nothing in the address", () => {
    expect(parseCatalogParams({}, known)).toEqual({
      q: "",
      audience: "resident",
      page: 1,
    });
  });

  it("reads every filter", () => {
    const params = parseCatalogParams(
      {
        q: "счётчик",
        territory: "burabay",
        for: "business",
        situation: "meters",
        category: "water",
        organization: "akmola-water",
        page: "3",
      },
      known,
    );
    expect(params).toEqual({
      q: "счётчик",
      territory: "burabay",
      audience: "business",
      situation: "meters",
      category: "water",
      organization: "akmola-water",
      page: 3,
    });
  });

  it("trims and shortens the search text", () => {
    expect(parseCatalogParams({ q: "  вода   газ  " }, known).q).toBe("вода газ");
    expect(parseCatalogParams({ q: "я".repeat(300) }, known).q).toHaveLength(100);
  });

  it("takes the first value when a parameter is repeated", () => {
    expect(parseCatalogParams({ q: ["вода", "газ"] }, known).q).toBe("вода");
  });

  it("ignores unknown territories, organizations, situations and categories", () => {
    const params = parseCatalogParams(
      { territory: "mars", organization: "nobody", situation: "party", category: "magic" },
      known,
    );
    expect(params).toEqual({ q: "", audience: "resident", page: 1 });
  });

  it("treats anything but business as residents", () => {
    expect(parseCatalogParams({ for: "everyone" }, known).audience).toBe("resident");
    expect(parseCatalogParams({ for: "resident" }, known).audience).toBe("resident");
  });

  it("falls back to the first page for broken page numbers", () => {
    for (const page of ["0", "-2", "abc", "2.5x", "", "99999999999999999999"]) {
      expect(parseCatalogParams({ page }, known).page, page).toBe(1);
    }
  });
});

describe("catalogHref", () => {
  it("opens the plain catalog without parameters", () => {
    expect(catalogHref("ru", {})).toBe("/ru/services");
  });

  it("leaves out values that are the default", () => {
    expect(catalogHref("ru", { q: "", audience: "resident", page: 1 })).toBe("/ru/services");
  });

  it("writes the filters in a stable order and encodes the text", () => {
    expect(
      catalogHref("kk", {
        page: 2,
        q: "лицевой счёт",
        audience: "business",
        territory: "burabay",
        situation: "contracts",
        category: "billing",
        organization: "billing-center",
      }),
    ).toBe(
      "/kk/services?q=%D0%BB%D0%B8%D1%86%D0%B5%D0%B2%D0%BE%D0%B9+%D1%81%D1%87%D1%91%D1%82&territory=burabay&for=business&situation=contracts&category=billing&organization=billing-center&page=2",
    );
  });

  it("can be read back into the same parameters", () => {
    const original = {
      q: "газ",
      territory: "kokshetau",
      audience: "business" as const,
      situation: "connection" as const,
      page: 4,
    };
    const url = new URL(`http://x${catalogHref("ru", original)}`);
    const raw = Object.fromEntries(url.searchParams);
    expect(parseCatalogParams(raw, known)).toEqual(original);
  });
});

describe("toServiceQuery", () => {
  it("turns address parameters into a catalog query", () => {
    const query = toServiceQuery(
      {
        q: "газ",
        territory: "kokshetau",
        audience: "business",
        situation: "connection",
        category: "gas",
        organization: "akmola-gas",
        page: 2,
      },
      "kk",
      12,
    );
    expect(query).toEqual({
      lang: "kk",
      q: "газ",
      territoryId: "kokshetau",
      audience: "business",
      situationId: "connection",
      categoryId: "gas",
      organizationId: "akmola-gas",
      sort: undefined,
      page: 2,
      pageSize: 12,
    });
  });

  it("lists popular services first only when nothing is searched", () => {
    expect(toServiceQuery({ q: "", audience: "resident", page: 1 }, "ru", 12).sort).toBe("popular");
    expect(toServiceQuery({ q: "вода", audience: "resident", page: 1 }, "ru", 12).sort).toBe(
      undefined,
    );
  });
});
