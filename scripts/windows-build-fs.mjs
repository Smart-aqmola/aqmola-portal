import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncBuiltinESMExports } from "node:module";
import { setTimeout as sleep } from "node:timers/promises";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Windows can briefly refuse mkdir during parallel Next.js output generation. */
export function createBuildMkdir(mkdir, { root, platform = process.platform, wait = sleep }) {
  const buildRoot = path.resolve(root);
  function inBuildDirectory(target) {
    const filename = target instanceof URL ? fileURLToPath(target) : String(target);
    const relative = path.relative(buildRoot, path.resolve(filename));
    return (
      relative === "" ||
      (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`))
    );
  }
  return async function mkdirWithRetry(target, options) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await mkdir(target, options);
      } catch (error) {
        if (
          platform !== "win32" ||
          error?.code !== "EPERM" ||
          options?.recursive !== true ||
          attempt >= 3 ||
          !inBuildDirectory(target)
        )
          throw error;
        await wait(50 * 2 ** attempt);
      }
    }
  };
}

// Loaded only by the build launcher, including Next's child workers via NODE_OPTIONS.
if (process.platform === "win32") {
  fs.promises.mkdir = createBuildMkdir(fs.promises.mkdir.bind(fs.promises), {
    root: path.join(projectRoot, ".next"),
  });
  syncBuiltinESMExports();
}
