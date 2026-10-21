const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { readFile, unlink } = require("node:fs/promises");
const { randomInt, randomUUID } = require("node:crypto");
const { resolve } = require("node:path");
const { createApp } = require("../dist/src/app.js");
const { Database } = require("../dist/src/database.js");
let app, db, base;
const userIds = new Set(),
  ids = new Set();
const profile = (iin = String(randomInt(1_000_000, 9_000_000)).padStart(12, "0")) => ({
  iin,
  firstName: "Тест",
  lastName: "Проверочный",
  consent: true,
});
function phone() {
  const value = "+7700" + String(randomInt(0, 10_000_000)).padStart(7, "0");
  return value;
}
before(async () => {
  app = await createApp();
  await app.listen(0, "127.0.0.1");
  base = await app.getUrl();
  db = app.get(Database);
});
after(async () => {
  try {
    if (db) {
      await db.user.deleteMany({ where: { id: { in: [...userIds] } } });
      await db.otpChallenge.deleteMany({ where: { id: { in: [...ids] } } });
    }
    await Promise.all(
      [...ids].map((id) => unlink(resolve(".local-sms", `${id}.json`)).catch(() => {})),
    );
  } finally {
    if (app) await app.close();
  }
});
async function request(path, body, token, method = "POST") {
  const response = await fetch(`${base}/api/v1/auth/${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = {
    status: response.status,
    body: response.status === 204 ? null : await response.json(),
    headers: response.headers,
  };
  if (path === "register" && result.status === 201) userIds.add(result.body.user.id);
  return result;
}
async function code(number, purpose) {
  const response = await request("codes", { phone: number, purpose });
  assert.equal(response.status, 202, JSON.stringify(response.body));
  assert.ok(!("code" in response.body));
  ids.add(response.body.challengeId);
  const delivery = JSON.parse(
    await readFile(resolve(".local-sms", `${response.body.challengeId}.json`), "utf8"),
  );
  return { challengeId: response.body.challengeId, code: delivery.code };
}
async function allowResend(number) {
  await db.otpChallenge.updateMany({
    where: { phone: number, id: { in: [...ids] } },
    data: { createdAt: new Date(Date.now() - 61_000) },
  });
}
async function register(number = phone(), data = profile()) {
  const otp = await code(number, "register");
  const result = await request("register", { ...otp, ...data });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  return { ...result.body, phone: number, otp, profile: data };
}

test("registration, normalized phone, private profile and hashed credentials", async () => {
  const number = phone();
  const otp = await code("8 (700) " + number.slice(5), "register");
  const data = profile();
  const result = await request("register", { ...otp, ...data, email: "test@example.invalid" });
  assert.equal(result.status, 201);
  assert.equal(result.body.user.phone, number);
  assert.equal(result.body.tokenType, "Bearer");
  assert.equal((await request("me", undefined, undefined, "GET")).status, 401);
  const me = await request("me", undefined, result.body.token, "GET");
  assert.equal(me.status, 200);
  assert.equal(me.body.iin, data.iin);
  assert.equal(me.headers.get("cache-control"), "no-store");
  assert.ok(!("blocked" in me.body));
  const stored = await db.session.findFirst({ where: { userId: result.body.user.id } });
  assert.notEqual(stored.tokenHash, result.body.token);
  assert.equal(stored.tokenHash.length, 64);
  const challenge = await db.otpChallenge.findUnique({ where: { id: otp.challengeId } });
  assert.notEqual(challenge.codeHash, otp.code);
  assert.ok(challenge.consumedAt);
  assert.equal((await request("register", { ...otp, ...data })).status, 401);
});

test("login, logout and logout-all revoke server sessions", async () => {
  const user = await register();
  await allowResend(user.phone);
  const login = await request("login", await code(user.phone, "login"));
  assert.equal(login.status, 200);
  assert.equal(login.body.user.id, user.user.id);
  assert.notEqual(login.body.token, user.token);
  assert.equal((await request("logout", undefined, login.body.token)).status, 204);
  assert.equal((await request("me", undefined, login.body.token, "GET")).status, 401);
  assert.equal((await request("me", undefined, user.token, "GET")).status, 200);
  assert.equal((await request("logout-all", undefined, user.token)).status, 204);
  assert.equal((await request("me", undefined, user.token, "GET")).status, 401);
});

test("five wrong attempts lock a code; expiration and unknown accounts fail", async () => {
  const otp = await code(phone(), "register");
  const wrong = otp.code === "000000" ? "000001" : "000000";
  for (let i = 0; i < 5; i++)
    assert.equal((await request("register", { ...otp, code: wrong, ...profile() })).status, 401);
  assert.equal((await db.otpChallenge.findUnique({ where: { id: otp.challengeId } })).attempts, 5);
  assert.equal((await request("register", { ...otp, ...profile() })).status, 401);
  const expired = await code(phone(), "register");
  await db.otpChallenge.update({
    where: { id: expired.challengeId },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.equal((await request("register", { ...expired, ...profile() })).status, 401);
  const unknown = await code(phone(), "login");
  assert.equal((await request("login", unknown)).status, 401);
});

test("resend invalidates the old code and registration conflicts cannot overwrite users", async () => {
  const number = phone();
  const old = await code(number, "register");
  assert.equal((await request("codes", { phone: number, purpose: "register" })).status, 429);
  await allowResend(number);
  const replacement = await code(number, "register");
  assert.equal((await request("register", { ...old, ...profile() })).status, 401);
  const data = profile();
  const registered = await request("register", { ...replacement, ...data });
  assert.equal(registered.status, 201);
  const other = await code(phone(), "register");
  assert.equal((await request("register", { ...other, ...profile(data.iin) })).status, 409);
  assert.equal(
    (await db.user.findUnique({ where: { id: registered.body.user.id } })).phone,
    number,
  );
});

test("parallel use consumes a code once; expired and blocked sessions fail", async () => {
  const number = phone(),
    otp = await code(number, "register"),
    data = profile();
  const results = await Promise.all([
    request("register", { ...otp, ...data }),
    request("register", { ...otp, ...data }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 401]);
  const user = results.find((r) => r.status === 201).body;
  await db.user.update({ where: { id: user.user.id }, data: { blocked: true } });
  assert.equal((await request("me", undefined, user.token, "GET")).status, 401);
  await db.user.update({ where: { id: user.user.id }, data: { blocked: false } });
  await db.session.updateMany({
    where: { userId: user.user.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.equal((await request("me", undefined, user.token, "GET")).status, 401);
});

test("validation rejects malformed identity, missing consent and privilege fields", async () => {
  assert.equal((await request("codes", { phone: "+123", purpose: "login" })).status, 400);
  assert.equal((await request("login", { challengeId: randomUUID(), code: "123456" })).status, 401);
  for (const extra of [
    { consent: false },
    { firstName: "   " },
    { iin: "123" },
    { role: "admin" },
    { email: "invalid" },
  ]) {
    assert.equal(
      (
        await request("register", {
          challengeId: randomUUID(),
          code: "123456",
          ...profile(),
          ...extra,
        })
      ).status,
      400,
    );
  }
});

test("hourly phone and IP limits are stored in PostgreSQL", async () => {
  const number = phone(),
    now = new Date();
  const dummy = (number, ipHash) => {
    const id = randomUUID();
    ids.add(id);
    return {
      id,
      phone: number,
      purpose: "login",
      codeHash: "0".repeat(64),
      ipHash,
      createdAt: new Date(now.getTime() - 61_000),
      expiresAt: new Date(now.getTime() + 60_000),
    };
  };
  await db.otpChallenge.createMany({
    data: Array.from({ length: 5 }, () => dummy(number, "test-only-rate-limit")),
  });
  assert.equal((await request("codes", { phone: number, purpose: "login" })).status, 429);
  const seed = await db.otpChallenge.findFirst({
    where: { id: { in: [...ids] }, NOT: { ipHash: "test-only-rate-limit" } },
  });
  assert.ok(seed);
  const rows = Array.from({ length: 20 }, () => dummy(phone(), seed.ipHash));
  await db.otpChallenge.createMany({ data: rows });
  try {
    assert.equal((await request("codes", { phone: phone(), purpose: "login" })).status, 429);
  } finally {
    await db.otpChallenge.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
  }
});
