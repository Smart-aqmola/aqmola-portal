const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes, randomUUID, createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { Client } = require("pg");
const { createApp } = require("../dist/src/app.js");
const { Database } = require("../dist/src/database.js");
const originalUrl = process.env.DATABASE_URL;
const databaseName = "aqmola_properties_test_" + randomUUID().replaceAll("-", "");
let control,
  app,
  db,
  base,
  created = false,
  owner,
  stranger,
  admin;
const input = {
  territoryId: "test-city",
  locality: "Кокшетау",
  street: " улица Абая ",
  house: "10-А",
  flat: "5",
  type: "apartment",
  relation: "owner",
  personalAccount: "123 456",
  ownerInfo: "Тестовый пользователь",
};
async function account(index, roles = ["resident"]) {
  const user = await db.user.create({
    data: {
      phone: "+7700" + String(index).padStart(7, "0"),
      iin: "900101" + String(index).padStart(6, "0"),
      firstName: "Тест",
      lastName: "Тестовый",
      phoneVerifiedAt: new Date(),
      consentAt: new Date(),
      roles,
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
async function request(path = "", actor, body, method = "GET") {
  const response = await fetch(`${base}/api/v1/properties${path}`, {
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
before(
  async () => {
    assert.match(databaseName, /^aqmola_properties_test_[a-f0-9]{32}$/);
    control = new Client({ connectionString: originalUrl });
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
    await db.territory.create({ data: { id: "test-city", kind: "city", name: { ru: "Тест" } } });
    owner = await account(1);
    stranger = await account(2);
    admin = await account(3, ["system_admin"]);
  },
  { timeout: 90000 },
);
after(async () => {
  try {
    if (app) await app.close();
    assert.match(databaseName, /^aqmola_properties_test_[a-f0-9]{32}$/);
    assert.notEqual(new URL(originalUrl).pathname, "/" + databaseName);
    if (created) await control.query(`DROP DATABASE "${databaseName}"`);
  } finally {
    process.env.DATABASE_URL = originalUrl;
    if (control) await control.end();
  }
});
test("requires login; assigns owner from session and persists normalized frontend fields", async () => {
  assert.equal((await request()).status, 401);
  const result = await request("", owner, input, "POST");
  assert.equal(result.status, 201);
  assert.equal(result.cache, "no-store");
  assert.equal(result.body.ownerId, owner.id);
  assert.equal(result.body.street, "улица Абая");
  assert.equal(result.body.personalAccount, "123456");
  assert.equal(result.body.version, 1);
  assert.deepEqual(result.body.verification, { status: "unverified", documents: [] });
  const saved = await db.property.findUnique({ where: { id: result.body.id } });
  assert.equal(saved.locality, input.locality);
  const audit = await db.auditEntry.findFirst({ where: { entityId: result.body.id } });
  assert.equal(audit.userId, owner.id);
  assert.equal(JSON.stringify(audit).includes(input.ownerInfo), false);
});
test("lists only own objects; other users and system admin cannot read or edit foreign objects", async () => {
  const own = (await request("", owner)).body;
  assert.equal(own.length, 1);
  for (const actor of [stranger, admin]) {
    assert.deepEqual((await request("", actor)).body, []);
    assert.deepEqual(
      await request("/" + own[0].id, actor),
      await request("/" + randomUUID(), actor),
    );
    assert.equal(
      (await request("/" + own[0].id, actor, { ...input, version: 1 }, "PATCH")).status,
      404,
    );
  }
});
test("rejects owner/status/role injection and applies frontend validation", async () => {
  for (const extra of [
    { ownerId: stranger.id },
    { verification: { status: "confirmed" } },
    { roles: ["system_admin"] },
  ]) {
    assert.equal((await request("", owner, { ...input, ...extra }, "POST")).status, 400);
  }
  const invalid = await request(
    "",
    owner,
    {
      ...input,
      territoryId: "unknown",
      flat: "",
      house: "!!",
      street: "а".repeat(81),
      personalAccount: "123",
    },
    "POST",
  );
  assert.deepEqual(invalid.body.error.fields, {
    territoryId: "required",
    personalAccount: "format",
    street: "long",
    house: "format",
    flat: "required",
  });
  assert.equal((await request("", owner, { ...input, locality: null }, "POST")).status, 400);
  assert.equal((await request("/not-uuid", owner)).status, 400);
});
test("updates with version; simultaneous writes conflict and failed writes produce no audit", async () => {
  const property = (await request("", owner)).body[0];
  const path = "/" + property.id;
  const results = await Promise.all(
    ["tenant", "representative"].map((relation) =>
      request(path, owner, { ...input, relation, version: 1 }, "PATCH"),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(results.find((r) => r.status === 409).body.error.code, "stale");
  const current = (await request(path, owner)).body;
  assert.equal(current.version, 2);
  assert.equal(current.verification.status, "unverified");
  assert.equal(await db.auditEntry.count({ where: { entityId: property.id } }), 2);
});
test("all declared relations accepted without granting verified rights; empty optional fields omitted", async () => {
  for (const relation of ["owner", "representative", "tenant", "lawful_user"]) {
    const result = await request(
      "",
      stranger,
      { ...input, type: "house", flat: "", personalAccount: "", relation },
      "POST",
    );
    assert.equal(result.status, 201);
    assert.equal(result.body.relation, relation);
    assert.equal(result.body.verification.status, "unverified");
    assert.equal("flat" in result.body, false);
    assert.equal("personalAccount" in result.body, false);
  }
});
test("concurrent additions enforce 30-object limit without extra records or audits", async () => {
  const seed = { ...input, street: input.street.trim(), ownerId: admin.id };
  await db.property.createMany({ data: Array.from({ length: 29 }, () => seed) });
  const results = await Promise.all([
    request("", admin, input, "POST"),
    request("", admin, input, "POST"),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 400]);
  assert.equal(await db.property.count({ where: { ownerId: admin.id } }), 30);
  assert.equal(
    await db.auditEntry.count({ where: { userId: admin.id, entityType: "property" } }),
    1,
  );
});
