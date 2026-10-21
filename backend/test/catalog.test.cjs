const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../dist/src/app.js");
let app, base;
before(async () => {
  app = await createApp();
  await app.listen(0, "127.0.0.1");
  base = await app.getUrl();
});
after(async () => {
  if (app) await app.close();
});
async function get(path) {
  const response = await fetch(`${base}/api/v1/${path}`);
  return { status: response.status, body: await response.json() };
}

test("database readiness and all reference lists", async () => {
  assert.equal((await get("health/ready")).status, 200);
  for (const path of ["territories", "organizations", "categories", "situations"]) {
    const { status, body } = await get(path);
    assert.equal(status, 200);
    assert.ok(body.length > 0);
    assert.equal(typeof body[0].name.ru, "string");
  }
});

test("pagination is deterministic and service details match the list", async () => {
  const first = (await get("services?pageSize=2")).body;
  const next = (await get("services?pageSize=2&page=2")).body;
  assert.equal(first.items.length, 2);
  assert.equal(first.pageCount, Math.ceil(first.total / 2));
  assert.ok(!first.items.some((a) => next.items.some((b) => a.id === b.id)));
  const service = first.items[0];
  assert.deepEqual((await get(`services/${service.slug}`)).body, service);
  assert.ok(!("searchText" in service));
  assert.match(service.updatedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal((await get(`services?q=${service.code}`)).body.items[0].id, service.id);
});

test("combined provider, territory, category and audience filters", async () => {
  const all = (await get("services?pageSize=100")).body.items;
  const orgs = (await get("organizations?territoryId=kokshetau")).body;
  const allowed = new Set(orgs.map((org) => org.id));
  const query = "services?territoryId=kokshetau&audience=resident&pageSize=100";
  const filtered = (await get(query)).body;
  const expected = all.filter(
    (s) => allowed.has(s.organizationId) && s.audiences.includes("resident"),
  );
  assert.deepEqual(filtered.items.map((s) => s.id).sort(), expected.map((s) => s.id).sort());
  const sample = expected[0];
  assert.ok(sample);
  const combined = (
    await get(`${query}&organizationId=${sample.organizationId}&categoryId=${sample.categoryId}`)
  ).body;
  assert.ok(combined.items.length > 0);
  assert.ok(
    combined.items.every(
      (s) => s.organizationId === sample.organizationId && s.categoryId === sample.categoryId,
    ),
  );
  assert.equal(
    (await get("services?territoryId=unknown")).body.total,
    all.filter((s) => orgs.find((o) => o.id === s.organizationId)?.territories === "all").length,
  );
});

test("invalid queries are rejected and absent services return 404", async () => {
  for (const query of [
    "page=0",
    "page=-1",
    "page=abc",
    "pageSize=101",
    "pageSize=1.5",
    "lang=de",
    "audience=admin",
    "popular=yes",
    "unexpected=1",
  ]) {
    assert.equal((await get(`services?${query}`)).status, 400, query);
  }
  assert.equal((await get("services/not-a-service")).status, 404);
  assert.deepEqual((await get("services?q=zzznomatchzzz")).body.items, []);
});

test("popular filter and Swagger routes are available", async () => {
  const list = (await get("services?popular=true&pageSize=100")).body.items;
  assert.ok(list.length > 0);
  assert.ok(list.every((s) => s.popular));
  const response = await fetch(`${base}/api/docs-json`);
  const doc = await response.json();
  assert.equal(response.status, 200);
  assert.ok(doc.paths["/api/v1/services"]);
  assert.ok(doc.paths["/api/v1/services/{slug}"]);
});
