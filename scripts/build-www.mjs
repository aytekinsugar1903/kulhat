// Copies the playable web build into www/ for Capacitor and refreshes the repo root.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staging = path.join(root, ".www-staging");
fs.rmSync(staging, { recursive: true, force: true });
execFileSync(process.execPath, ["source/scripts/export-kulhat.mjs", staging], {
  cwd: root,
  stdio: "inherit",
});
const www = path.join(root, "www");
fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });
for (const name of ["index.html", "js", "assets"]) {
  fs.cpSync(path.join(staging, name), path.join(www, name), { recursive: true });
  fs.cpSync(path.join(staging, name), path.join(root, name), { recursive: true });
}
fs.copyFileSync(path.join(staging, "BUILD-INFO.json"), path.join(root, "BUILD-INFO.json"));
fs.rmSync(staging, { recursive: true, force: true });
console.log("www and root playable files updated");
