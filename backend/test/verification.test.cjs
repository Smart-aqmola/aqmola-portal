const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes, createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { readFile, writeFile, unlink } = require("node:fs/promises");
const { resolve } = require("node:path");
const { Client } = require("pg");
const { createApp } = require("../dist/src/app.js");
const { Database } = require("../dist/src/database.js");
const { Role } = require("../dist/generated/prisma/client.js");
const { organizationRoles } = require("../dist/src/security/roles.js");
const originalUrl = process.env.DATABASE_URL;
const databaseName = "aqmola_verification_test_" + randomUUID().replaceAll("-", "");
let control,
  created = false,
  db,
  app,
  base,
  owner,
  stranger,
  reviewer,
  otherReviewer,
  admin,
  sequence = 1;
const accounts = new Map(),
  files = new Set();
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=",
  "base64",
);
const input = {
  territoryId: "area-a",
  locality: "Тест",
  street: "Абая",
  house: "1",
  flat: "2",
  type: "apartment",
  relation: "owner",
  ownerInfo: "Тест",
};
async function account(roles = ["resident"], organizationId) {
  const i = sequence++;
  const user = await db.user.create({
    data: {
      phone: "+7700" + String(i).padStart(7, "0"),
      iin: "900101" + String(i).padStart(6, "0"),
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
async function request(path, actor, body, method = "GET") {
  const response = await fetch(base + "/api/v1/" + path, {
    method,
    headers: {
      ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}),
      ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
  });
  const content = response.headers.get("content-type") || "";
  return {
    status: response.status,
    headers: response.headers,
    body: content.includes("json")
      ? await response.json()
      : Buffer.from(await response.arrayBuffer()),
  };
}
async function property(actor = owner, territoryId = "area-a") {
  const result = await request("properties", actor, { ...input, territoryId }, "POST");
  assert.equal(result.status, 201);
  return result.body;
}
async function upload(
  p,
  { actor = owner, bytes = png, name = "proof.png", mime = "image/png", version = p.version } = {},
) {
  const form = new FormData();
  form.append("version", String(version));
  form.append("file", new Blob([bytes], { type: mime }), name);
  const result = await request(`properties/${p.id}/documents`, actor, form, "POST");
  if (result.status === 201) files.add(result.body.id);
  return result;
}
async function pending(actor = owner, territoryId = "area-a") {
  const p = await property(actor, territoryId),
    file = await upload(p, { actor });
  assert.equal(file.status, 201);
  const result = await request(
    `properties/${p.id}/verification`,
    actor,
    { method: "document", documents: [file.body.id], version: file.body.version },
    "POST",
  );
  assert.equal(result.status, 201);
  return { ...result.body, file: file.body };
}
before(
  async () => {
    assert.match(databaseName, /^aqmola_verification_test_[a-f0-9]{32}$/);
    control = new Client({ connectionString: originalUrl });
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
    await db.territory.createMany({
      data: ["area-a", "area-b"].map((id) => ({ id, kind: "city", name: { ru: "Тест" } })),
    });
    for (const suffix of ["a", "b"]) {
      await db.organization.create({
        data: {
          id: "org-" + suffix,
          name: { ru: "Тест" },
          sector: "water",
          territories: { create: { territoryId: "area-" + suffix } },
        },
      });
    }
    owner = await account();
    stranger = await account();
    for (const role of Object.values(Role))
      accounts.set(
        role,
        await account([role], organizationRoles.includes(role) ? "org-a" : undefined),
      );
    reviewer = accounts.get("request_specialist");
    admin = accounts.get("system_admin");
    otherReviewer = await account(["request_specialist"], "org-b");
  },
  { timeout: 90000 },
);
after(async () => {
  try {
    if (db) for (const d of await db.attachment.findMany({ select: { id: true } })) files.add(d.id);
    if (app) await app.close();
    for (const id of files) {
      assert.match(id, /^[a-f0-9-]{36}$/);
      await unlink(resolve(".private-documents", id)).catch(() => {});
    }
    assert.match(databaseName, /^aqmola_verification_test_[a-f0-9]{32}$/);
    assert.notEqual(new URL(originalUrl).pathname, "/" + databaseName);
    if (created) await control.query(`DROP DATABASE "${databaseName}"`);
  } finally {
    process.env.DATABASE_URL = originalUrl;
    if (control) await control.end();
  }
});

test("private uploads persist hashes; only owner may list or download; file responses cannot render inline", async () => {
  const p = await property(),
    result = await upload(p);
  assert.equal(result.status, 201);
  assert.equal(result.body.version, 2);
  assert.equal(result.body.sha256, createHash("sha256").update(png).digest("hex"));
  assert.deepEqual(await readFile(resolve(".private-documents", result.body.id)), png);
  const path = `properties/${p.id}/documents`;
  assert.equal((await request(path)).status, 401);
  for (const actor of [stranger, admin, reviewer]) {
    assert.equal((await request(path, actor)).status, 404);
    assert.equal((await request(path + "/" + result.body.id, actor)).status, 404);
  }
  const downloaded = await request(path + "/" + result.body.id, owner);
  assert.equal(downloaded.status, 200);
  assert.deepEqual(downloaded.body, png);
  assert.equal(downloaded.headers.get("cache-control"), "no-store");
  assert.equal(downloaded.headers.get("x-content-type-options"), "nosniff");
  assert.equal(downloaded.headers.get("content-security-policy"), "sandbox");
  assert.match(downloaded.headers.get("content-disposition"), /^attachment;/);
  assert.equal((await request(".private-documents/" + result.body.id, owner)).status, 404);
});
test("rejects fake files, wrong MIME, empty, oversized and stale uploads without DB changes", async () => {
  const p = await property();
  const bad = [
    { bytes: Buffer.from("not an image") },
    { bytes: Buffer.alloc(0) },
    { name: "proof.exe" },
    { mime: "text/html" },
    { bytes: Buffer.alloc(5 * 1024 * 1024 + 1) },
    {
      bytes: Buffer.from("%PDF-1.7\n1 0 obj\n<< /JavaScript (bad) >>\nendobj\ntrailer\n%%EOF"),
      name: "proof.pdf",
      mime: "application/pdf",
    },
  ];
  for (const options of bad) {
    const result = await upload(p, options);
    assert.ok([400, 413].includes(result.status), String(result.status));
  }
  assert.equal(await db.attachment.count({ where: { propertyId: p.id } }), 0);
  assert.equal((await upload(p, { version: 2 })).body.error.code, "stale");
  assert.equal((await db.property.findUnique({ where: { id: p.id } })).version, 1);
});

test("accepts PDF and JPEG formats and rejects foreign uploads before saving bytes", async () => {
  const p = await property();
  const pdf = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n",
  );
  const jpeg = await readFile(resolve("../public/photos/zerenda.jpg"));
  const foreign = await upload(p, { actor: stranger });
  assert.equal(foreign.status, 404);
  assert.equal(await db.attachment.count({ where: { propertyId: p.id } }), 0);
  const result = await upload(p, { bytes: pdf, name: "proof.pdf", mime: "application/pdf" });
  assert.equal(result.status, 201);
  assert.equal(
    (
      await upload(p, {
        bytes: jpeg,
        name: "proof.jpeg",
        mime: "image/jpeg",
        version: result.body.version,
      })
    ).status,
    201,
  );
});
test("five-file limit, removal, and concurrent expected versions are enforced", async () => {
  const p = await property();
  let version = 1,
    first;
  for (let i = 0; i < 5; i++) {
    const result = await upload(p, { version });
    assert.equal(result.status, 201);
    version = result.body.version;
    first ??= result.body.id;
  }
  assert.equal((await upload(p, { version })).status, 400);
  const path = `properties/${p.id}/documents/${first}?version=${version}`;
  assert.equal((await request(path, stranger, null, "DELETE")).status, 404);
  const deleted = await request(path, owner, null, "DELETE");
  assert.equal(deleted.status, 200);
  version = deleted.body.version;
  assert.equal((await request(`properties/${p.id}/documents/${first}`, owner)).status, 404);
  const results = await Promise.all([upload(p, { version }), upload(p, { version })]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(await db.attachment.count({ where: { propertyId: p.id } }), 5);
});
test("submission accepts only own uploaded IDs and never simulates a government confirmation", async () => {
  const p = await property(),
    other = await property(stranger),
    doc = await upload(other, { actor: stranger });
  const path = `properties/${p.id}/verification`;
  assert.equal(
    (
      await request(
        path,
        owner,
        { method: "document", documents: [doc.body.id], version: 1 },
        "POST",
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        path,
        owner,
        { method: "document", documents: [{ name: "proof.png", size: png.length }], version: 1 },
        "POST",
      )
    ).status,
    400,
  );
  assert.equal(
    (await request(path, owner, { method: "document", documents: [], version: 1 }, "POST")).status,
    400,
  );
  assert.equal(
    (await request(path, owner, { method: "state_integration", version: 1 }, "POST")).status,
    503,
  );
  assert.equal(
    (await db.property.findUnique({ where: { id: p.id } })).verification.status,
    "unverified",
  );
  const submitted = await pending();
  assert.equal(submitted.verification.status, "pending_check");
  assert.equal((await upload(submitted)).status, 403);
  assert.equal(
    (
      await request(
        `properties/${submitted.id}/documents/${submitted.file.id}?version=${submitted.version}`,
        owner,
        null,
        "DELETE",
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        `properties/${submitted.id}/verification`,
        owner,
        { method: "document", documents: [submitted.file.id], version: submitted.version },
        "POST",
      )
    ).status,
    403,
  );
});
test("only request specialist may review; territory isolation, servesAll and self-review prevention", async () => {
  const p = await pending();
  for (const [role, actor] of accounts)
    if (role !== "request_specialist") {
      assert.equal((await request("org/property-verifications", actor)).status, 403, role);
      assert.equal(
        (
          await request(
            `org/property-verifications/${p.id}/decision`,
            actor,
            { decision: "confirmed", version: p.version },
            "POST",
          )
        ).status,
        403,
        role,
      );
    }
  const own = await pending(reviewer);
  const queue = await request("org/property-verifications?pageSize=1", reviewer);
  assert.equal(queue.status, 200);
  assert.equal(queue.body.items.length, 1);
  assert.equal(
    (await request("org/property-verifications", reviewer)).body.items.some(
      (row) => row.id === own.id,
    ),
    false,
  );
  assert.equal((await request(`org/property-verifications/${own.id}`, reviewer)).status, 404);
  assert.equal((await request(`org/property-verifications/${p.id}`, otherReviewer)).status, 404);
  assert.equal(
    (await request(`org/property-verifications/${p.id}/documents/${p.file.id}`, otherReviewer))
      .status,
    404,
  );
  assert.equal(
    (
      await request(
        `org/property-verifications/${p.id}/decision`,
        otherReviewer,
        { decision: "confirmed", version: p.version },
        "POST",
      )
    ).status,
    404,
  );
  const read = await request(`org/property-verifications/${p.id}/documents/${p.file.id}`, reviewer);
  assert.equal(read.status, 200);
  assert.deepEqual(read.body, png);
  await db.organization.update({ where: { id: "org-b" }, data: { servesAll: true } });
  assert.equal((await request(`org/property-verifications/${p.id}`, otherReviewer)).status, 200);
  await db.organization.update({ where: { id: "org-b" }, data: { servesAll: false } });
});
test("rejection requires reason; retry and confirmation record version and audit atomically", async () => {
  const p = await pending(),
    path = `org/property-verifications/${p.id}/decision`;
  for (const note of [undefined, " "])
    assert.equal(
      (
        await request(
          path,
          reviewer,
          { decision: "rejected", version: p.version, ...(note ? { note } : {}) },
          "POST",
        )
      ).status,
      400,
    );
  const rejected = await request(
    path,
    reviewer,
    { decision: "rejected", note: " Документ не читается ", version: p.version },
    "POST",
  );
  assert.equal(rejected.status, 201);
  assert.equal(rejected.body.verification.status, "rejected");
  assert.equal(rejected.body.verification.note, "Документ не читается");
  assert.equal(
    (await request(path, reviewer, { decision: "confirmed", version: p.version }, "POST")).body
      .error.code,
    "stale",
  );
  const retry = await request(
    `properties/${p.id}/verification`,
    owner,
    { method: "document", documents: [p.file.id], version: rejected.body.version },
    "POST",
  );
  assert.equal(retry.status, 201);
  assert.equal("note" in retry.body.verification, false);
  const count = await db.auditEntry.count({ where: { entityId: p.id } });
  const decisions = await Promise.all(
    ["confirmed", "rejected"].map((decision) =>
      request(path, reviewer, { decision, note: "Проверено", version: retry.body.version }, "POST"),
    ),
  );
  assert.deepEqual(decisions.map((r) => r.status).sort(), [201, 409]);
  assert.equal(await db.auditEntry.count({ where: { entityId: p.id } }), count + 1);
  const event = await db.auditEntry.findFirst({
    where: { entityId: p.id, action: "verification_decided" },
  });
  assert.equal(event.userId, reviewer.id);
  assert.equal(event.before.status, "pending_check");
});
test("editing invalidates pending/confirmed rights and specialist access to prior documents", async () => {
  const p = await pending();
  const confirmed = await request(
    `org/property-verifications/${p.id}/decision`,
    reviewer,
    { decision: "confirmed", version: p.version },
    "POST",
  );
  assert.equal(confirmed.status, 201);
  const edited = await request(
    `properties/${p.id}`,
    owner,
    { ...input, house: "3", version: confirmed.body.version },
    "PATCH",
  );
  assert.equal(edited.status, 200);
  assert.equal(edited.body.verification.status, "unverified");
  assert.equal(
    (await request(`org/property-verifications/${p.id}/documents/${p.file.id}`, reviewer)).status,
    404,
  );
  const pendingProperty = await pending();
  const changed = await request(
    `properties/${pendingProperty.id}`,
    owner,
    { ...input, version: pendingProperty.version },
    "PATCH",
  );
  assert.equal(changed.status, 200);
  assert.equal(
    (
      await request(
        `org/property-verifications/${pendingProperty.id}/decision`,
        reviewer,
        { decision: "confirmed", version: pendingProperty.version },
        "POST",
      )
    ).body.error.code,
    "stale",
  );
});
test("blocked organizations and removed reviewer roles immediately lose review access", async () => {
  const p = await pending();
  await db.organization.update({ where: { id: "org-a" }, data: { blocked: true } });
  assert.equal((await request(`org/property-verifications/${p.id}`, reviewer)).status, 403);
  await db.organization.update({ where: { id: "org-a" }, data: { blocked: false } });
  await db.user.update({ where: { id: reviewer.id }, data: { roles: ["contact_operator"] } });
  assert.equal(
    (
      await request(
        `org/property-verifications/${p.id}/decision`,
        reviewer,
        { decision: "confirmed", version: p.version },
        "POST",
      )
    ).status,
    403,
  );
  await db.user.update({ where: { id: reviewer.id }, data: { roles: ["request_specialist"] } });
});
test("missing or altered private bytes cannot be submitted, downloaded, or confirmed", async () => {
  const p = await property(),
    d = await upload(p),
    path = resolve(".private-documents", d.body.id);
  await writeFile(path, "modified");
  assert.equal((await request(`properties/${p.id}/documents/${d.body.id}`, owner)).status, 500);
  assert.equal(
    (
      await request(
        `properties/${p.id}/verification`,
        owner,
        { method: "document", documents: [d.body.id], version: d.body.version },
        "POST",
      )
    ).status,
    500,
  );
  assert.equal(
    (await db.property.findUnique({ where: { id: p.id } })).verification.status,
    "unverified",
  );
  const submitted = await pending();
  await unlink(resolve(".private-documents", submitted.file.id));
  const before = await db.auditEntry.count({ where: { entityId: submitted.id } });
  assert.equal(
    (
      await request(
        `org/property-verifications/${submitted.id}/decision`,
        reviewer,
        { decision: "confirmed", version: submitted.version },
        "POST",
      )
    ).status,
    500,
  );
  assert.equal(
    (await db.property.findUnique({ where: { id: submitted.id } })).verification.status,
    "pending_check",
  );
  assert.equal(await db.auditEntry.count({ where: { entityId: submitted.id } }), before);
});
