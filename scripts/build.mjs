import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env };
if (process.platform === "win32") {
  const preload = new URL("./windows-build-fs.mjs", import.meta.url).href;
  env.NODE_OPTIONS = [env.NODE_OPTIONS, `--import=${JSON.stringify(preload)}`]
    .filter(Boolean)
    .join(" ");
}
const child = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "build", ...process.argv.slice(2)],
  {
    cwd: root,
    env,
    stdio: "inherit",
  },
);
child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
