const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes, randomUUID, createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { readFile, unlink } = require("node:fs/promises");
const { resolve } = require("node:path");
const { Client } = require("pg");
const { createApp } = require("../dist/src/app.js");
const { Database } = require("../dist/src/database.js");
const { Role } = require("../dist/generated/prisma/client.js");
const { organizationRoles } = require("../dist/src/security/roles.js");
const originalUrl = process.env.DATABASE_URL;
const databaseName = "aqmola_security_test_" + randomUUID().replaceAll("-", "");
const fixtures = new Map(),
  messages = new Set();
let app,
  db,
  base,
  control,
  created = false,
  counter = 1,
  administrator,
  adminToken,
  previousAdminToken;

function command(args) {
  return spawnSync(process.execPath, args, {
    cwd: resolve("."),
    env: process.env,
    encoding: "utf8",
    timeout: 60000,
  });
}
async function token(user) {
  const value = randomBytes(32).toString("base64url");
  await db.session.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(value).digest("hex"),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  return value;
}
async function user(roles = [Role.resident], organizationId) {
  const number = counter++;
  return db.user.create({
    data: {
      phone: "+7700" + String(number).padStart(7, "0"),
      iin: "900101" + String(number).padStart(6, "0"),
      firstName: "Тест",
      lastName: "Пользователь",
      roles,
      organizationId,
      phoneVerifiedAt: new Date(),
      consentAt: new Date(),
    },
  });
}
async function request(path, accessToken, body, method = "GET", headers = {}) {
  const response = await fetch(`${base}/api/v1/${path}`, {
    method,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: response.status === 204 ? null : await response.json() };
}
before(
  async () => {
    // A new, uniquely named database isolates administrative tests from existing local accounts.
    assert.match(databaseName, /^aqmola_security_test_[a-f0-9]{32}$/);
    control = new Client({ connectionString: originalUrl });
    await control.connect();
    await control.query(`CREATE DATABASE "${databaseName}"`);
    created = true;
    const url = new URL(originalUrl);
    url.pathname = "/" + databaseName;
    process.env.DATABASE_URL = url.toString();
    const migration = command(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
    assert.equal(migration.status, 0, migration.stderr);
    app = await createApp();
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
    db = app.get(Database);
    await db.organization.createMany({
      data: [
        { id: "security-org-a", name: { ru: "Тест А" }, sector: "water", servesAll: true },
        { id: "security-org-b", name: { ru: "Тест Б" }, sector: "heat", servesAll: true },
      ],
    });
    administrator = await user();
    previousAdminToken = await token(administrator);
    const bootstrap = command([
      "--import",
      "tsx",
      "scripts/bootstrap-admin.ts",
      "--user-id",
      administrator.id,
    ]);
    assert.equal(bootstrap.status, 0, bootstrap.stderr);
    administrator = await db.user.findUnique({ where: { id: administrator.id } });
    adminToken = await token(administrator);
    for (const role of Object.values(Role)) {
      const account =
        role === Role.system_admin
          ? administrator
          : await user([role], organizationRoles.includes(role) ? "security-org-a" : undefined);
      fixtures.set(role, {
        user: account,
        token: role === Role.system_admin ? adminToken : await token(account),
      });
    }
    const other = await user([Role.organization_admin], "security-org-b");
    fixtures.set("other_org_admin", { user: other, token: await token(other) });
  },
  { timeout: 90000 },
);
after(async () => {
  try {
    if (app) await app.close();
    await Promise.all(
      [...messages].map((id) => unlink(resolve(".local-sms", `${id}.json`)).catch(() => {})),
    );
    // Drop only the disposable database created by this test, never the configured development database.
    assert.match(databaseName, /^aqmola_security_test_[a-f0-9]{32}$/);
    assert.notEqual(new URL(originalUrl).pathname, "/" + databaseName);
    if (created) await control.query(`DROP DATABASE "${databaseName}"`);
  } finally {
    process.env.DATABASE_URL = originalUrl;
    if (control) await control.end();
  }
});

test("bootstrap has no public route, revokes previous session and refuses a second assignment", async () => {
  assert.equal((await request("me", previousAdminToken)).status, 401);
  const second = command([
    "--import",
    "tsx",
    "scripts/bootstrap-admin.ts",
    "--user-id",
    administrator.id,
  ]);
  assert.notEqual(second.status, 0);
  assert.equal((await request("admin/bootstrap", undefined, {}, "POST")).status, 404);
  assert.equal(await db.auditEntry.count({ where: { action: "bootstrap_system_admin" } }), 1);
});

test("all twelve roles are enforced on the server, without an implicit administrator bypass", async () => {
  assert.equal((await request("admin/users")).status, 401);
  for (const role of Object.values(Role)) {
    const fixture = fixtures.get(role);
    assert.equal(
      (await request("admin/users", fixture.token)).status,
      role === Role.system_admin ? 200 : 403,
      role,
    );
    assert.equal(
      (await request("org", fixture.token)).status,
      organizationRoles.includes(role) ? 200 : 403,
      role,
    );
    assert.equal(
      (await request("org/staff", fixture.token)).status,
      role === Role.organization_admin ? 200 : 403,
      role,
    );
  }
  assert.equal(
    (
      await request("admin/users", fixtures.get(Role.resident).token, undefined, "GET", {
        "X-Role": "system_admin",
      })
    ).status,
    403,
  );
});

test("staff registry is scoped to your organization, paginated and masks personal data", async () => {
  const resident = fixtures.get(Role.resident);
  const own = await request(`me?userId=${administrator.id}`, resident.token);
  assert.equal(own.body.id, resident.user.id);
  const first = await request("org/staff?pageSize=1", fixtures.get(Role.organization_admin).token);
  assert.equal(first.status, 200);
  assert.equal(first.body.items.length, 1);
  assert.equal(first.body.total, organizationRoles.length);
  assert.ok(first.body.items.every((member) => member.organizationId === "security-org-a"));
  const second = await request("org/staff", fixtures.get("other_org_admin").token);
  assert.equal(second.body.total, 1);
  assert.equal(second.body.items[0].organizationId, "security-org-b");
  assert.ok(second.body.items[0].phone.includes("•••"));
  assert.equal(second.body.items[0].iin, "••••••••••••");
  assert.equal(
    (
      await request(
        "org/staff?organizationId=security-org-b",
        fixtures.get(Role.organization_admin).token,
      )
    ).status,
    400,
  );
  assert.equal(
    (await request("org/staff?pageSize=101", fixtures.get(Role.organization_admin).token)).status,
    400,
  );
});

test("only a system administrator can assign access; invalid combinations and stale versions fail", async () => {
  const target = fixtures.get(Role.resident).user;
  for (const accessToken of [
    fixtures.get(Role.resident).token,
    fixtures.get(Role.organization_admin).token,
  ]) {
    assert.equal(
      (
        await request(
          `admin/users/${target.id}`,
          accessToken,
          { version: target.version, roles: [Role.system_admin] },
          "PATCH",
        )
      ).status,
      403,
    );
  }
  assert.equal(
    (
      await request(
        "me",
        fixtures.get(Role.resident).token,
        { version: target.version, roles: [Role.system_admin] },
        "PATCH",
      )
    ).status,
    400,
  );
  for (const changes of [
    { roles: ["made_up_role"] },
    { roles: [Role.accountant] },
    { roles: [Role.resident], organizationId: "security-org-a" },
    { roles: [Role.system_admin, Role.accountant], organizationId: "security-org-a" },
    { roles: [Role.accountant], organizationId: "unknown-org" },
  ])
    assert.equal(
      (
        await request(
          `admin/users/${target.id}`,
          adminToken,
          { version: target.version, ...changes },
          "PATCH",
        )
      ).status,
      400,
    );
  const stale = await request(
    `admin/users/${target.id}`,
    adminToken,
    { version: 999, status: "blocked" },
    "PATCH",
  );
  assert.equal(stale.status, 409);
  assert.equal(stale.body.error.code, "stale");
  assert.equal(
    await db.auditEntry.count({ where: { entityId: target.id, action: "access_updated" } }),
    0,
  );
});

test("assigning a role revokes old sessions and records access changes atomically", async () => {
  const fixture = fixtures.get(Role.resident);
  const changed = await request(
    `admin/users/${fixture.user.id}`,
    adminToken,
    {
      version: fixture.user.version,
      roles: [Role.resident, Role.accountant],
      organizationId: "security-org-a",
    },
    "PATCH",
  );
  assert.equal(changed.status, 200);
  assert.equal(changed.body.version, fixture.user.version + 1);
  assert.equal((await request("me", fixture.token)).status, 401);
  const fresh = await token(fixture.user);
  assert.equal((await request("org", fresh)).status, 200);
  assert.equal((await request("admin/users", fresh)).status, 403);
  const audit = await db.auditEntry.findFirst({
    where: { entityId: fixture.user.id, action: "access_updated" },
  });
  assert.deepEqual(audit.after.roles, [Role.resident, Role.accountant]);
  assert.equal(audit.userId, administrator.id);
});

test("user block closes sessions, and unblocking does not revive them", async () => {
  const fixture = fixtures.get(Role.tenant);
  let changed = await request(
    `admin/users/${fixture.user.id}`,
    adminToken,
    { version: fixture.user.version, status: "blocked" },
    "PATCH",
  );
  assert.equal(changed.status, 200);
  assert.equal((await request("me", fixture.token)).status, 401);
  const manuallyIssued = await token(fixture.user);
  assert.equal((await request("me", manuallyIssued)).status, 401);
  changed = await request(
    `admin/users/${fixture.user.id}`,
    adminToken,
    { version: changed.body.version, status: "active" },
    "PATCH",
  );
  assert.equal(changed.status, 200);
  assert.equal((await request("me", fixture.token)).status, 401);
  assert.equal((await request("me", await token(fixture.user))).status, 200);
});

test("blocking an organization closes its cabinet, without affecting another organization", async () => {
  const oldA = fixtures.get(Role.organization_admin),
    other = fixtures.get("other_org_admin");
  const blocked = await request(
    "admin/organizations/security-org-a",
    adminToken,
    { version: 1, blocked: true },
    "PATCH",
  );
  assert.equal(blocked.status, 200);
  assert.equal((await request("org", oldA.token)).status, 401);
  const fresh = await token(oldA.user);
  assert.equal((await request("org", fresh)).status, 403);
  assert.equal((await request("me", fresh)).status, 200);
  assert.equal((await request("org", other.token)).status, 200);
  assert.equal(
    (
      await request(
        "admin/organizations/security-org-a",
        adminToken,
        { version: 1, blocked: false },
        "PATCH",
      )
    ).status,
    409,
  );
  const unblocked = await request(
    "admin/organizations/security-org-a",
    adminToken,
    { version: blocked.body.version, blocked: false },
    "PATCH",
  );
  assert.equal(unblocked.status, 200);
  assert.equal((await request("org", oldA.token)).status, 401);
  assert.equal((await request("org", fresh)).status, 200);
  assert.equal(
    await db.auditEntry.count({
      where: { entityType: "organization", entityId: "security-org-a" },
    }),
    2,
  );
  const publicList = await request("organizations");
  assert.ok(!("blocked" in publicList.body[0]));
});

test("last active system administrator cannot be blocked or demoted", async () => {
  const current = await db.user.findUnique({ where: { id: administrator.id } });
  for (const changes of [{ status: "blocked" }, { roles: [Role.resident] }]) {
    assert.equal(
      (
        await request(
          `admin/users/${current.id}`,
          adminToken,
          { version: current.version, ...changes },
          "PATCH",
        )
      ).status,
      403,
    );
  }
  assert.equal((await request("admin/users", adminToken)).status, 200);
});

test("concurrent administrator demotions leave one active administrator", async () => {
  const second = await user();
  const promoted = await request(
    `admin/users/${second.id}`,
    adminToken,
    { version: second.version, roles: [Role.system_admin] },
    "PATCH",
  );
  assert.equal(promoted.status, 200);
  const secondToken = await token(second);
  const current = await db.user.findUnique({ where: { id: administrator.id } });
  const results = await Promise.all([
    request(
      `admin/users/${current.id}`,
      adminToken,
      { version: current.version, roles: [Role.resident] },
      "PATCH",
    ),
    request(
      `admin/users/${second.id}`,
      secondToken,
      { version: promoted.body.version, roles: [Role.resident] },
      "PATCH",
    ),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 403]);
  assert.equal(
    await db.user.count({ where: { blocked: false, roles: { has: Role.system_admin } } }),
    1,
  );
});
