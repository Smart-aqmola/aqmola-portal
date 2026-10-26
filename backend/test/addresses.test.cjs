const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes, createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { Client } = require("pg");
const { createApp } = require("../dist/src/app.js");
const { Database } = require("../dist/src/database.js");
const { seedAddresses } = require("../dist/prisma/address-seed.js");
const { addresses } = require("../dist/prisma/data/addresses.js");
const originalUrl = process.env.DATABASE_URL;
const databaseName = "aqmola_addresses_test_" + randomUUID().replaceAll("-", "");
let control,
  created = false,
  app,
  db,
  base,
  owner,
  stranger;
async function request(path, actor, body, method = "GET") {
  const response = await fetch(base + "/api/v1/" + path, {
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
async function account(index) {
  const user = await db.user.create({
    data: {
      phone: "+7700" + String(index).padStart(7, "0"),
      iin: "900101" + String(index).padStart(6, "0"),
      firstName: "Тест",
      lastName: "Тест",
      phoneVerifiedAt: new Date(),
      consentAt: new Date(),
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
async function property(change = {}) {
  return db.property.create({
    data: {
      ownerId: owner.id,
      territoryId: "kokshetau",
      locality: "Кокшетау",
      street: "улица Абая",
      house: "10",
      flat: "1",
      type: "apartment",
      relation: "owner",
      ownerInfo: "Тест",
      addressId: "kokshetau-abay",
      verification: { status: "confirmed", documents: [] },
      ...change,
    },
  });
}
const states = (rows) => Object.fromEntries(rows.map((r) => [r.sector, r.state]));
before(
  async () => {
    assert.match(databaseName, /^aqmola_addresses_test_[a-f0-9]{32}$/);
    control = new Client({ connectionString: originalUrl, connectionTimeoutMillis: 5000 });
    await control.connect();
    await control.query(`CREATE DATABASE "${databaseName}"`);
    created = true;
    const url = new URL(originalUrl);
    url.pathname = "/" + databaseName;
    process.env.DATABASE_URL = url.toString();
    const migration = spawnSync(
      process.execPath,
      ["node_modules/prisma/build/index.js", "migrate", "deploy"],
      { env: process.env, encoding: "utf8", timeout: 60000 },
    );
    assert.equal(migration.status, 0, migration.stderr);
    app = await createApp();
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
    db = app.get(Database);
    const territories = [...new Set(addresses.map((a) => a.territoryId))];
    await db.territory.createMany({
      data: territories.map((id) => ({
        id,
        kind: "city",
        name: {
          ru: id === "kokshetau" ? "Кокшетау" : id,
          kk: id === "kokshetau" ? "Көкшетау" : id,
        },
      })),
    });
    await seedAddresses(db);
    for (const sector of ["water", "heat", "electricity", "gas"])
      await db.organization.create({
        data: { id: sector, name: { ru: sector, kk: "kk-" + sector }, sector, servesAll: true },
      });
    await db.organization.create({
      data: {
        id: "local-electricity",
        name: { ru: "Местная сеть", kk: "Жергілікті желі" },
        sector: "electricity",
        territories: { create: { territoryId: "kokshetau" } },
      },
    });
    for (const territory of ["kokshetau", "akkol"])
      await db.organization.create({
        data: {
          id: "waste-" + territory,
          name: { ru: "ТБО" },
          sector: "waste",
          territories: { create: { territoryId: territory } },
        },
      });
    await db.situation.create({
      data: { id: "contracts", name: { ru: "Договоры" }, summary: { ru: "Тест" } },
    });
    for (const [code, organizationId, sector] of [
      ["1001", "gas", "gas"],
      ["1002", "water", "water"],
      ["1003", "waste-kokshetau", "waste"],
    ]) {
      await db.category.upsert({
        where: { id: sector },
        create: { id: sector, name: { ru: sector } },
        update: {},
      });
      await db.service.create({
        data: {
          id: "service-" + code,
          slug: "service-" + code,
          code,
          organizationId,
          categoryId: sector,
          situationId: "contracts",
          audiences: ["resident"],
          title: { ru: code },
          summary: { ru: "Тест" },
          free: true,
          searchText: code,
          workingDays: 1,
          channel: "online",
          updatedAt: new Date("2026-10-26T00:00:00Z"),
        },
      });
    }
    owner = await account(1);
    stranger = await account(2);
  },
  { timeout: 90000 },
);
after(async () => {
  try {
    if (app) await app.close();
    assert.match(databaseName, /^aqmola_addresses_test_[a-f0-9]{32}$/);
    assert.notEqual(new URL(originalUrl).pathname, "/" + databaseName);
    if (created) await control.query(`DROP DATABASE "${databaseName}"`);
  } finally {
    process.env.DATABASE_URL = originalUrl;
    if (control) await control.end();
  }
});

test("directory seed is idempotent; public ru/kk search returns frontend fields and max eight matches", async () => {
  await seedAddresses(db);
  assert.equal(await db.address.count(), 33);
  assert.deepEqual((await request("addresses/search")).body, []);
  assert.deepEqual((await request("addresses/search?q=%20%20")).body, []);
  const result = await request("addresses/search?q=" + encodeURIComponent("КОКШЕТАУ  Абая"));
  assert.equal(result.status, 200);
  assert.equal(result.body.length, 1);
  assert.deepEqual(result.body[0], {
    id: "kokshetau-abay",
    territoryId: "kokshetau",
    locality: "Кокшетау",
    street: "улица Абая",
    label: "Кокшетау, улица Абая",
    without: [],
  });
  const kk = await request("addresses/search?lang=kk&q=" + encodeURIComponent("Көкшетау Абай"));
  assert.equal(kk.body[0].street, "Абай көшесі");
  assert.equal((await request("addresses/search?q=" + encodeURIComponent("улица"))).body.length, 8);
  assert.equal(
    (await request("addresses/search?territoryId=akkol&q=" + encodeURIComponent("Абая"))).body
      .length,
    0,
  );
  assert.deepEqual(
    (await request("addresses/search?q=" + encodeURIComponent("' OR 1=1 --"))).body,
    [],
  );
  assert.equal((await request("addresses/search?q=" + "a".repeat(201))).status, 400);
  assert.equal((await request("addresses/search?lang=bad")).status, 400);
});
test("requires session, ownership and confirmed property; ignores no client-supplied permissions", async () => {
  const p = await property(),
    path = `properties/${p.id}/services`;
  assert.equal((await request(path)).status, 401);
  assert.equal((await request(path, stranger)).status, 404);
  assert.equal((await request(`properties/${randomUUID()}/services`, stranger)).status, 404);
  assert.equal((await request(path + "?territoryId=akkol", owner)).status, 400);
  assert.equal((await request(path + "?without=", owner)).status, 400);
  for (const status of ["unverified", "pending_check", "rejected"]) {
    const unconfirmed = await property({ verification: { status, documents: [] } });
    assert.equal((await request(`properties/${unconfirmed.id}/services`, owner)).status, 403);
  }
});
test("returns five sectors and all eligible providers, localized, deterministic, without administrative metadata", async () => {
  const p = await property(),
    path = `properties/${p.id}/services`;
  const result = await request(path + "?lang=kk", owner);
  assert.equal(result.status, 200);
  assert.equal(result.cache, "no-store");
  assert.deepEqual(
    result.body.map((r) => r.sector),
    ["electricity", "water", "heat", "gas", "waste"],
  );
  assert.equal(
    Object.values(states(result.body)).every((s) => s === "served"),
    true,
  );
  const grid = result.body[0].providers;
  assert.equal(grid.length, 2);
  assert.equal(grid[1].name, "Жергілікті желі");
  assert.equal(
    grid.some((p) => "blocked" in p || "version" in p || "employees" in p),
    false,
  );
  const village = await property({
    addressId: "akkol-novorybinka",
    territoryId: "akkol",
    locality: "Новорыбинка",
    street: "улица Школьная",
  });
  const rural = (await request(`properties/${village.id}/services`, owner)).body;
  assert.deepEqual(
    rural.find((r) => r.sector === "waste").providers.map((p) => p.id),
    ["waste-akkol"],
  );
  assert.equal(rural[0].providers.length, 1);
});
test("missing networks override region-wide providers and unavailable service checks return not_serviced", async () => {
  const p = await property({
    addressId: "atbasar-marinovka",
    territoryId: "atbasar",
    locality: "Мариновка",
    street: "улица Центральная",
  });
  const result = await request(`properties/${p.id}/services`, owner);
  assert.equal(result.status, 200);
  assert.deepEqual(states(result.body), {
    electricity: "served",
    water: "served",
    heat: "no_network",
    gas: "no_network",
    waste: "no_provider",
  });
  assert.deepEqual(result.body.find((r) => r.sector === "gas").providers, []);
  const blocked = await request(`properties/${p.id}/services/1001`, owner);
  assert.equal(blocked.status, 422);
  assert.equal(blocked.body.error.code, "not_serviced");
  assert.equal((await request(`properties/${p.id}/services/1002`, owner)).status, 200);
  assert.equal((await request(`properties/${p.id}/services/1003`, owner)).status, 422);
  assert.equal((await request(`properties/${p.id}/services/9999`, owner)).status, 404);
});
test("blocked providers disappear from address choices and service eligibility immediately", async () => {
  const p = await property();
  await db.organization.update({ where: { id: "water" }, data: { blocked: true } });
  const result = await request(`properties/${p.id}/services`, owner);
  assert.equal(states(result.body).water, "no_provider");
  assert.equal((await request(`properties/${p.id}/services/1002`, owner)).status, 422);
  await db.organization.update({ where: { id: "water" }, data: { blocked: false } });
  assert.equal((await request(`properties/${p.id}/services/1002`, owner)).status, 200);
});
test("never trusts addressId or assumes networks for an unknown manual address", async () => {
  for (const change of [
    { street: "Неизвестная улица" },
    { addressId: "missing" },
    { addressId: "akkol-novorybinka" },
    { territoryId: "akkol" },
    { locality: "Другой город" },
    { addressId: null, street: "Нет в справочнике" },
  ]) {
    const p = await property(change),
      result = await request(`properties/${p.id}/services`, owner);
    assert.equal(result.status, 422, JSON.stringify(change));
    assert.equal(result.body.error.code, "not_serviced");
  }
  const known = await property({
    addressId: null,
    locality: "  КӨКШЕТАУ ",
    street: "Абай  көшесі ",
  });
  assert.equal((await request(`properties/${known.id}/services`, owner)).status, 200);
  const duplicate = await db.address.findUnique({ where: { id: "kokshetau-abay" } });
  await db.address.create({ data: { ...duplicate, id: "duplicate-abay" } });
  assert.equal((await request(`properties/${known.id}/services`, owner)).status, 422);
  await db.address.delete({ where: { id: "duplicate-abay" } });
});
test("property edits invalidate previous eligibility; read checks never create applications or audit records", async () => {
  const p = await property();
  const audits = await db.auditEntry.count();
  assert.equal((await request(`properties/${p.id}/services/1002`, owner)).status, 200);
  assert.equal(await db.auditEntry.count(), audits);
  const edited = await request(
    `properties/${p.id}`,
    owner,
    {
      territoryId: p.territoryId,
      locality: p.locality,
      street: p.street,
      house: "11",
      flat: "1",
      type: "apartment",
      relation: "owner",
      ownerInfo: "Тест",
      addressId: p.addressId,
      version: 1,
    },
    "PATCH",
  );
  assert.equal(edited.status, 200);
  assert.equal((await request(`properties/${p.id}/services`, owner)).status, 403);
});
