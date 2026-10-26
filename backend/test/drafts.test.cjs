const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes, createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { Client } = require("pg");
const { createApp } = require("../dist/src/app.js");
const { Database } = require("../dist/src/database.js");
const originalUrl = process.env.DATABASE_URL;
const databaseName = "aqmola_drafts_test_" + randomUUID().replaceAll("-", "");
let control,
  created = false,
  db,
  app,
  base,
  owner,
  stranger,
  admin,
  specialist,
  property;
const iin = "900101123456";
async function account(index, roles = ["resident"], organizationId) {
  const user = await db.user.create({
    data: {
      phone: "+7700" + String(index).padStart(7, "0"),
      iin: index === 1 ? iin : "900101" + String(index).padStart(6, "0"),
      firstName: "Тест",
      lastName: "Пользователь",
      phoneVerifiedAt: new Date(),
      consentAt: new Date(),
      roles,
      organizationId,
    },
  });
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  return { id: user.id, token };
}
async function request(path = "", actor = owner, body, method = "GET") {
  const response = await fetch(base + "/api/v1/contract-applications" + path, {
    method,
    headers: {
      ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: response.status,
    body: await response.json(),
    cache: response.headers.get("cache-control"),
  };
}
async function make(actor = owner, p = property, slug = "gas-contract") {
  return request("", actor, { propertyId: p.id, serviceSlug: slug }, "POST");
}
before(
  async () => {
    assert.match(databaseName, /^aqmola_drafts_test_[a-f0-9]{32}$/);
    control = new Client({ connectionString: originalUrl, connectionTimeoutMillis: 5000 });
    await control.connect();
    await control.query(`CREATE DATABASE "${databaseName}"`);
    created = true;
    const url = new URL(originalUrl);
    url.pathname = "/" + databaseName;
    process.env.DATABASE_URL = url.toString();
    const result = spawnSync(
      process.execPath,
      ["node_modules/prisma/build/index.js", "migrate", "deploy"],
      { env: process.env, encoding: "utf8", timeout: 60000 },
    );
    assert.equal(result.status, 0, result.stderr);
    app = await createApp();
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
    db = app.get(Database);
    await db.territory.create({
      data: { id: "test-city", kind: "city", name: { ru: "Тест", kk: "Тест" } },
    });
    await db.address.create({
      data: {
        id: "test-address",
        territoryId: "test-city",
        locality: { ru: "Тест", kk: "Тест" },
        street: { ru: "Абая", kk: "Абай" },
        without: [],
        searchText: "тест абая",
      },
    });
    await db.organization.create({
      data: {
        id: "akmola-gas",
        name: { ru: "Тестовый газ", kk: "Тест газ" },
        sector: "gas",
        servesAll: true,
      },
    });
    await db.category.create({ data: { id: "gas", name: { ru: "Газ" } } });
    await db.situation.create({
      data: { id: "contracts", name: { ru: "Договор" }, summary: { ru: "Тест" } },
    });
    const data = {
      organizationId: "akmola-gas",
      categoryId: "gas",
      situationId: "contracts",
      audiences: ["resident"],
      title: { ru: "Договор газа", kk: "Газ шарты" },
      summary: { ru: "Тест" },
      free: true,
      searchText: "газ",
      workingDays: 1,
      channel: "online",
      updatedAt: new Date("2026-10-27T00:00:00Z"),
    };
    await db.service.create({
      data: { ...data, id: "gas-contract-service", slug: "gas-contract", code: "1001" },
    });
    await db.service.create({
      data: { ...data, id: "other-service", slug: "other-gas", code: "1002" },
    });
    owner = await account(1);
    stranger = await account(2);
    admin = await account(3, ["system_admin"]);
    specialist = await account(4, ["request_specialist"], "akmola-gas");
    property = await db.property.create({
      data: {
        ownerId: owner.id,
        territoryId: "test-city",
        locality: "Тест",
        street: "Абая",
        house: "10",
        flat: "5",
        type: "apartment",
        relation: "tenant",
        ownerInfo: "Тест",
        personalAccount: "123456",
        addressId: "test-address",
        verification: { status: "confirmed", documents: [] },
      },
    });
  },
  { timeout: 90000 },
);
after(async () => {
  try {
    if (app) await app.close();
    assert.match(databaseName, /^aqmola_drafts_test_[a-f0-9]{32}$/);
    assert.notEqual(new URL(originalUrl).pathname, "/" + databaseName);
    if (created) await control.query(`DROP DATABASE "${databaseName}"`);
  } finally {
    process.env.DATABASE_URL = originalUrl;
    if (control) await control.end();
  }
});

test("creates prefilled persistent draft with masked identity and no registration, number or signature", async () => {
  assert.equal(
    (await request("", null, { propertyId: property.id, serviceSlug: "gas-contract" }, "POST"))
      .status,
    401,
  );
  const result = await make();
  assert.equal(result.status, 201);
  assert.equal(result.cache, "no-store");
  const d = result.body;
  assert.equal(d.ownerId, owner.id);
  assert.equal(d.propertyId, property.id);
  assert.equal(d.serviceId, "gas-contract-service");
  assert.equal(d.providerId, "akmola-gas");
  assert.equal(d.status, "draft");
  assert.equal(d.version, 1);
  assert.deepEqual(d.signatures, {});
  assert.equal(d.number, undefined);
  assert.equal(d.submittedAt, undefined);
  assert.equal(d.applicant.iin, "900101••••56");
  assert.equal(d.applicant.lastName, "Пользователь");
  assert.equal(d.basis, "tenant");
  assert.equal(d.propertyType, "apartment");
  assert.equal(d.personalAccount, "123456");
  assert.deepEqual(d.meter, { has: false, serial: "", reading: "" });
  assert.deepEqual(d.consents, { personalData: false, terms: false });
  assert.deepEqual(d.attachments, []);
  assert.deepEqual(d.history, [{ status: "draft", at: d.createdAt, actor: "applicant" }]);
  const stored = await db.contractApplication.findUnique({ where: { id: d.id } });
  assert.equal(stored.draft.payload.serviceSlug, "gas-contract");
  assert.equal(stored.draft.updatedAt, d.updatedAt);
  assert.equal(JSON.stringify(stored).includes(iin), false);
  const restored = await request("/" + d.id);
  assert.deepEqual(restored.body, d);
  const kk = await request(
    "",
    owner,
    { propertyId: property.id, serviceSlug: "gas-contract", lang: "kk" },
    "POST",
  );
  assert.equal(kk.body.serviceTitle, "Газ шарты");
});
test("requires own confirmed property and an available known contract service, including provider and network checks", async () => {
  const before = await db.contractApplication.count();
  assert.equal((await make(stranger)).status, 404);
  assert.equal((await make(owner, property, "other-gas")).status, 422);
  assert.equal((await make(owner, property, "missing")).status, 404);
  await db.property.update({
    where: { id: property.id },
    data: { verification: { status: "unverified", documents: [] } },
  });
  assert.equal((await make()).status, 403);
  await db.property.update({
    where: { id: property.id },
    data: { verification: { status: "confirmed", documents: [] } },
  });
  await db.address.update({ where: { id: "test-address" }, data: { without: ["gas"] } });
  assert.equal((await make()).body.error.code, "not_serviced");
  await db.address.update({ where: { id: "test-address" }, data: { without: [] } });
  await db.organization.update({ where: { id: "akmola-gas" }, data: { blocked: true } });
  assert.equal((await make()).status, 422);
  await db.organization.update({ where: { id: "akmola-gas" }, data: { blocked: false } });
  assert.equal(await db.contractApplication.count(), before);
});
test("restores and lists only own drafts; administrator and organization specialist cannot inspect them", async () => {
  const d = (await make()).body;
  for (const actor of [stranger, admin, specialist]) {
    assert.equal((await request("/" + d.id, actor)).status, 404);
    assert.equal(
      (await request("/" + d.id, actor, { version: 1, previousContract: "changed" }, "PUT")).status,
      404,
    );
    assert.equal((await request("", actor)).body.total, 0);
  }
  const list = await request("?page=1&pageSize=1");
  assert.equal(list.body.items.length, 1);
  assert.ok(list.body.total >= 3);
  assert.equal((await request("?ownerId=" + stranger.id)).status, 400);
  assert.equal((await request("/not-uuid")).status, 400);
});
test("saves incomplete bounded form, merges nested fields, clears with empty strings and persists across app restart", async () => {
  const d = (await make()).body;
  const saved = await request(
    "/" + d.id,
    owner,
    {
      version: 1,
      applicant: { firstName: "", email: "unfinished@", phone: "+7" },
      rightSince: "2026-",
      personalAccount: "12",
      meter: { has: true, serial: "", reading: "1," },
      notifyBy: "email",
      consents: { terms: true },
    },
    "PUT",
  );
  assert.equal(saved.status, 200);
  assert.equal(saved.body.version, 2);
  assert.equal(saved.body.applicant.lastName, d.applicant.lastName);
  assert.equal(saved.body.applicant.firstName, "");
  assert.equal(saved.body.meter.reading, "1,");
  assert.equal(saved.body.consents.personalData, false);
  const next = await request(
    "/" + d.id,
    owner,
    { version: 2, meter: { serial: "123-А" }, previousContract: "older" },
    "PUT",
  );
  assert.equal(next.status, 200);
  assert.equal(next.body.meter.has, true);
  assert.equal(next.body.meter.reading, "1,");
  await app.close();
  app = await createApp();
  await app.listen(0, "127.0.0.1");
  base = await app.getUrl();
  db = app.get(Database);
  const restored = await request("/" + d.id);
  assert.deepEqual(restored.body, next.body);
  assert.equal(restored.body.status, "draft");
  assert.deepEqual(restored.body.signatures, {});
});
test("rejects forged readonly fields, pseudo-documents, unknown nested fields, invalid types and identity changes", async () => {
  const d = (await make()).body;
  for (const patch of [
    { status: "registered" },
    { number: "DEMO-DOG-2026-00001" },
    { signatures: { application: { method: "demo_ecp" } } },
    { ownerId: stranger.id },
    { propertyId: randomUUID() },
    { providerId: "other" },
    { address: "new" },
    { history: [] },
    { serviceSlug: "other" },
    { applicant: { roles: ["system_admin"] } },
    { meter: { has: "true" } },
    { consents: { terms: "true" } },
    { attachments: [{ key: "property", name: "fake.pdf", size: 1 }] },
    { previousContract: null },
    { previousContract: "a".repeat(201) },
    { applicant: { iin: "900101000000" } },
  ]) {
    assert.equal(
      (await request("/" + d.id, owner, { version: 1, ...patch }, "PUT")).status,
      400,
      JSON.stringify(patch),
    );
  }
  assert.equal((await request("/" + d.id, owner, { version: 1 }, "PUT")).status, 400);
  const own = await request("/" + d.id, owner, { version: 1, applicant: { iin } }, "PUT");
  assert.equal(own.status, 200);
  assert.equal(own.body.applicant.iin, "900101••••56");
  assert.equal(
    JSON.stringify(await db.contractApplication.findUnique({ where: { id: d.id } })).includes(iin),
    false,
  );
  assert.equal(
    (
      await request(
        "",
        owner,
        { propertyId: property.id, serviceSlug: "gas-contract", status: "draft" },
        "POST",
      )
    ).status,
    400,
  );
});
test("concurrent saves conflict atomically and audits contain no applicant or form values", async () => {
  const d = (await make()).body;
  const results = await Promise.all(
    ["first-secret", "second-secret"].map((previousContract) =>
      request("/" + d.id, owner, { version: 1, previousContract }, "PUT"),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(results.find((r) => r.status === 409).body.error.code, "stale");
  const audit = await db.auditEntry.findMany({ where: { entityId: d.id }, orderBy: { at: "asc" } });
  assert.equal(audit.length, 2);
  assert.equal(audit[1].after.version, 2);
  const text = JSON.stringify(audit);
  assert.equal(text.includes("first-secret"), false);
  assert.equal(text.includes("second-secret"), false);
  assert.equal(text.includes(iin), false);
  assert.equal(text.includes("Пользователь"), false);
});
test("later changes of object or provider do not erase editable work, but do not refresh or authorize the saved snapshot", async () => {
  const d = (await make()).body;
  await db.property.update({
    where: { id: property.id },
    data: { verification: { status: "unverified", documents: [] }, house: "11" },
  });
  await db.organization.update({ where: { id: "akmola-gas" }, data: { blocked: true } });
  const saved = await request(
    "/" + d.id,
    owner,
    { version: 1, previousContract: "Keep work" },
    "PUT",
  );
  assert.equal(saved.status, 200);
  assert.equal(saved.body.address, d.address);
  assert.equal(saved.body.status, "draft");
  assert.equal((await make()).status, 403);
  await db.property.update({
    where: { id: property.id },
    data: { verification: { status: "confirmed", documents: [] }, house: "10" },
  });
  await db.organization.update({ where: { id: "akmola-gas" }, data: { blocked: false } });
  await db.contractApplication.update({ where: { id: d.id }, data: { status: "registered" } });
  assert.equal(
    (await request("/" + d.id, owner, { version: 2, previousContract: "cannot" }, "PUT")).status,
    404,
  );
});
test("concurrent creation cannot exceed frontend's limit of 60 applications per owner", async () => {
  const seed = await db.contractApplication.findFirst({ where: { ownerId: owner.id } });
  const data = {
    ownerId: admin.id,
    propertyId: property.id,
    serviceId: seed.serviceId,
    providerId: seed.providerId,
    draft: seed.draft,
  };
  await db.contractApplication.createMany({ data: Array.from({ length: 59 }, () => data) });
  // The database fixtures establish this account as the owner solely for this limit test.
  await db.property.update({ where: { id: property.id }, data: { ownerId: admin.id } });
  const results = await Promise.all([make(admin), make(admin)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 400]);
  assert.equal(await db.contractApplication.count({ where: { ownerId: admin.id } }), 60);
  assert.equal(
    await db.auditEntry.count({ where: { userId: admin.id, entityType: "contract_application" } }),
    1,
  );
});
