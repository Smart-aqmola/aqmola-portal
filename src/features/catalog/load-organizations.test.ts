import { describe, expect, it } from "vitest";
import { loadOrganizations } from "./load-organizations";

describe("loadOrganizations", () => {
  it("groups every organization by its field of work and skips empty fields", async () => {
    const groups = await loadOrganizations("ru");
    const all = groups.flatMap((group) => group.items);
    expect(all).toHaveLength(12);
    for (const group of groups) expect(group.items.length, group.sector).toBeGreaterThan(0);
    expect(groups.find((group) => group.sector === "waste")?.items).toHaveLength(2);
  });

  it("says where an organization works: the whole region or the named territories", async () => {
    const groups = await loadOrganizations("ru");
    const all = groups.flatMap((group) => group.items);
    expect(all.find((item) => item.id === "akmola-water")?.area).toBe("all");
    expect(all.find((item) => item.id === "kokshetau-eco")?.area).toEqual(["Кокшетау"]);
    const region = all.find((item) => item.id === "region-eco")?.area;
    expect(Array.isArray(region) && region.length).toBe(19);
  });

  it("counts the services of each organization", async () => {
    const all = (await loadOrganizations("ru")).flatMap((group) => group.items);
    expect(all.find((item) => item.id === "akmola-water")?.services).toBeGreaterThan(5);
    expect(all.every((item) => item.services > 0)).toBe(true);
  });

  it("names everything in the language of the visitor", async () => {
    const all = (await loadOrganizations("kk")).flatMap((group) => group.items);
    expect(all.find((item) => item.id === "akmola-water")?.name).toBe("Ақмола су арнасы");
    expect(all.find((item) => item.id === "kokshetau-eco")?.area).toEqual(["Көкшетау"]);
  });
});
