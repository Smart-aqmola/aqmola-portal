import { describe, expect, it } from "vitest";
import { getCatalogRepository } from "@/features/catalog/data";
import { sectors } from "@/features/catalog/domain/types";
import { locales } from "@/shared/i18n/config";
import { addressDirectory } from "./data/address-directory";
import { filterAddresses } from "./domain/address-search";
import { loadAddressSuggestions } from "./load-addresses";

describe("address directory", () => {
  it("points only at known territories and uses unique ids", async () => {
    const territories = new Set((await getCatalogRepository().listTerritories()).map((t) => t.id));
    const ids = addressDirectory.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of addressDirectory) {
      expect(territories.has(entry.territoryId), entry.id).toBe(true);
    }
  });

  it("names every place and street in Russian and Kazakh and lists real networks only", () => {
    for (const entry of addressDirectory) {
      for (const text of [entry.locality, entry.street]) {
        expect(text.ru.trim(), entry.id).not.toBe("");
        expect(text.kk?.trim(), entry.id).toBeTruthy();
      }
      for (const sector of entry.without ?? []) expect(sectors).toContain(sector);
    }
  });

  it("covers every city of the region", () => {
    const covered = new Set(addressDirectory.map((entry) => entry.territoryId));
    for (const city of ["kokshetau", "stepnogorsk", "kosshy"]) expect(covered.has(city)).toBe(true);
  });
});

describe("loadAddressSuggestions", () => {
  it("names the district only when the village differs from it", async () => {
    const list = await loadAddressSuggestions("ru");
    expect(list.find((item) => item.id === "kokshetau-abay")?.label).toBe("Кокшетау, улица Абая");
    expect(list.find((item) => item.id === "akkol-novorybinka")?.label).toBe(
      "Аккольский район, Новорыбинка, улица Школьная",
    );
  });

  it("speaks the language of the visitor", async () => {
    const list = await loadAddressSuggestions("kk");
    expect(list.find((item) => item.id === "kokshetau-abay")?.label).toBe("Көкшетау, Абай көшесі");
  });

  it("returns every address in every language", async () => {
    for (const lang of locales) {
      expect((await loadAddressSuggestions(lang)).length, lang).toBe(addressDirectory.length);
    }
  });

  it("carries the missing networks of a village", async () => {
    const list = await loadAddressSuggestions("ru");
    expect(list.find((item) => item.id === "atbasar-marinovka")?.without).toEqual(["gas", "heat"]);
    expect(list.find((item) => item.id === "kokshetau-abay")?.without).toEqual([]);
  });
});

describe("filterAddresses", () => {
  it("finds by street or village and ignores letter case", async () => {
    const list = await loadAddressSuggestions("ru");
    expect(filterAddresses(list, "АБАЯ").map((item) => item.id)).toEqual(
      expect.arrayContaining(["kokshetau-abay", "zerendi-abay", "ereymentau-abay"]),
    );
    expect(filterAddresses(list, "новорыбинка школьная")).toHaveLength(1);
  });

  it("finds by district name too", async () => {
    const list = await loadAddressSuggestions("ru");
    const found = filterAddresses(list, "аккольский", 20).map((item) => item.id);
    expect(found).toEqual(["akkol-zheltoksan", "akkol-auezov", "akkol-novorybinka"]);
  });

  it("returns nothing for an empty or unknown query and respects the limit", async () => {
    const list = await loadAddressSuggestions("ru");
    expect(filterAddresses(list, "  ")).toEqual([]);
    expect(filterAddresses(list, "марсианская")).toEqual([]);
    expect(filterAddresses(list, "улица", 3)).toHaveLength(3);
  });
});
