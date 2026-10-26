import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createBuildMkdir } from "./windows-build-fs.mjs";

const root = path.resolve(".next");
const denied = () => Object.assign(new Error("access denied"), { code: "EPERM" });

test("retries a transient Windows mkdir and preserves its return value and arguments", async () => {
  const waits = [];
  const target = path.join(root, "server", "app", "[lang].segments", "$d$lang");
  const options = { recursive: true, mode: 0o700 };
  let calls = 0;
  const mkdir = createBuildMkdir(
    async (name, opts) => {
      assert.equal(name, target);
      assert.equal(opts, options);
      if (++calls < 3) throw denied();
      return root;
    },
    { root, platform: "win32", wait: async (ms) => waits.push(ms) },
  );
  assert.equal(await mkdir(target, options), root);
  assert.equal(calls, 3);
  assert.deepEqual(waits, [50, 100]);
});

test("persistent EPERM is returned after a bounded number of retries", async () => {
  const error = denied(),
    waits = [];
  let calls = 0;
  const mkdir = createBuildMkdir(
    async () => {
      calls++;
      throw error;
    },
    {
      root,
      platform: "win32",
      wait: async (ms) => waits.push(ms),
    },
  );
  await assert.rejects(mkdir(root, { recursive: true }), (actual) => actual === error);
  assert.equal(calls, 4);
  assert.deepEqual(waits, [50, 100, 200]);
});

test("does not retry other errors, non-Windows calls, nonrecursive calls or paths outside .next", async () => {
  for (const scenario of [
    { code: "EACCES" },
    { code: "EEXIST" },
    { code: "ENOENT" },
    { platform: "linux" },
    { platform: "darwin" },
    { options: { recursive: false } },
    { target: path.resolve(".next-other", "file") },
    { target: path.join(root, "..", "private") },
  ]) {
    const error = Object.assign(new Error("failed"), { code: scenario.code ?? "EPERM" });
    let calls = 0;
    const mkdir = createBuildMkdir(
      async () => {
        calls++;
        throw error;
      },
      {
        root,
        platform: scenario.platform ?? "win32",
        wait: async () => assert.fail("unexpected retry"),
      },
    );
    await assert.rejects(
      mkdir(scenario.target ?? root, scenario.options ?? { recursive: true }),
      (actual) => actual === error,
    );
    assert.equal(calls, 1);
  }
});

test("handles URL and Buffer paths and leaves successful operations alone", async () => {
  for (const target of [
    pathToFileURL(path.join(root, "types")),
    Buffer.from(path.join(root, "cache")),
  ]) {
    let calls = 0;
    const mkdir = createBuildMkdir(
      async () => {
        if (++calls === 1) throw denied();
      },
      {
        root,
        platform: "win32",
        wait: async () => {},
      },
    );
    assert.equal(await mkdir(target, { recursive: true }), undefined);
    assert.equal(calls, 2);
  }
  const mkdir = createBuildMkdir(async () => "created", {
    root,
    wait: async () => assert.fail("unexpected retry"),
  });
  assert.equal(await mkdir(root, { recursive: true }), "created");
});
