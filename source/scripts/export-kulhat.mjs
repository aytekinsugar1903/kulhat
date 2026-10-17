// Small, deterministic bundler for this fixed local module graph. No build dependencies.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const args = process.argv.slice(2);
// --playables: add the YouTube Playables SDK (must load before game code) and
// emit only the playable files (no source/tests/README) for upload.
const playables = args.includes("--playables");
const output = path.resolve(
  args.find((a) => !a.startsWith("--")) || path.join(root, "release", "kulhat"),
);
const YT_SDK = "https://www.youtube.com/game_api/v1";
const modules = new Map(),
  definitions = [];
function identifierList(list) {
  return list
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const [local, alias] = x.split(/\s+as\s+/);
      return { local, alias: alias || local };
    });
}
function bundle(file) {
  file = path.resolve(file);
  if (modules.has(file)) return modules.get(file);
  if (!file.startsWith(dist + path.sep))
    throw Error("Only local dist modules are allowed");
  const id = modules.size;
  modules.set(file, id);
  let source = fs.readFileSync(file, "utf8"),
    returns = [];
  source = source.replace(
    /^import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];?\s*$/gm,
    (_, binding, ref) => {
      const dep = bundle(path.resolve(path.dirname(file), ref));
      if (binding.trim().startsWith("*"))
        return `const ${binding.trim().split(/\s+/)[2]}=M[${dep}];`;
      const names = identifierList(binding.replace(/^\s*\{|\}\s*$/g, ""));
      return `const {${names.map((n) => (n.alias === n.local ? n.local : `${n.local}:${n.alias}`)).join(",")}}=M[${dep}];`;
    },
  );
  source = source.replace(
    /^export\s*\{([\s\S]*?)\}\s*from\s*["']([^"']+)["'];?/gm,
    (_, list, ref) => {
      const dep = bundle(path.resolve(path.dirname(file), ref));
      returns.push(
        ...identifierList(list).map((n) => `${n.alias}:M[${dep}].${n.local}`),
      );
      return "";
    },
  );
  source = source.replace(/^export\s*\{([^}]+)\};?/gm, (_, list) => {
    returns.push(...identifierList(list).map((n) => `${n.alias}:${n.local}`));
    return "";
  });
  source = source.replace(
    /^export\s+(async\s+function|function|class|const|let|var)\s+(\w+)/gm,
    (_, type, name) => {
      returns.push(name);
      return `${type} ${name}`;
    },
  );
  if (/^import\s|^export\s/m.test(source))
    throw Error(`Unsupported syntax: ${file}`);
  definitions.push(
    `// ${path.relative(dist, file)}\nM[${id}]=(()=>{\n${source}\nreturn {${returns.join(",")}};\n})();`,
  );
  return id;
}
bundle(path.join(dist, "game.js"));
fs.mkdirSync(path.join(output, "js"), { recursive: true });
fs.mkdirSync(path.join(output, "assets"), { recursive: true });
fs.writeFileSync(
  path.join(output, "js", "kulhat.bundle.js"),
  `/* KÜLHAT standalone. Three.js MIT license: assets/THREE-LICENSE.txt */\n(()=>{"use strict";const M={};\n${definitions.join("\n")}\n})();\n`,
);
let html = fs.readFileSync(path.join(dist, "kulhat.html"), "utf8");
html = html.replace(
  /<script type="module">[\s\S]*?<\/script>/,
  (playables ? `<script src="${YT_SDK}"></script>\n    ` : "") +
    '<script src="./js/platform.js"></script>',
);
fs.copyFileSync(path.join(dist, "platform.js"), path.join(output, "js", "platform.js"));
html = html.replaceAll("./icon.svg", "./assets/icon.svg");
html = html.replaceAll("./icon-192.png", "./assets/icon-192.png");
fs.writeFileSync(path.join(output, "index.html"), html);
fs.copyFileSync(
  path.join(dist, "icon.svg"),
  path.join(output, "assets", "icon.svg"),
);
fs.copyFileSync(
  path.join(dist, "icon-192.png"),
  path.join(output, "assets", "icon-192.png"),
);
for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
  if (
    (/^(https?:|\/\/)/.test(match[1]) && !(playables && match[1] === YT_SDK)) ||
    (match[1] !== YT_SDK && !fs.existsSync(path.resolve(output, match[1])))
  )
    throw Error(`Non-local or missing entry asset: ${match[1]}`);
}
fs.copyFileSync(
  path.join(dist, "vendor", "LICENSE-THREE.txt"),
  path.join(output, "assets", "THREE-LICENSE.txt"),
);
if (!playables) {
// Include editable source and a dependency-free rebuild script alongside the playable.
for (const name of [
  "game.js",
  "platform.js",
  "core.js",
  "profile.js",
  "audio.js",
  "kulhat.html",
]) {
  fs.mkdirSync(path.join(output, "source", "dist"), { recursive: true });
  fs.copyFileSync(
    path.join(dist, name),
    path.join(output, "source", "dist", name),
  );
}
fs.cpSync(
  path.join(dist, "vendor"),
  path.join(output, "source", "dist", "vendor"),
  { recursive: true },
);
fs.copyFileSync(
  path.join(dist, "icon.svg"),
  path.join(output, "source", "dist", "icon.svg"),
);
fs.copyFileSync(
  path.join(dist, "icon-192.png"),
  path.join(output, "source", "dist", "icon-192.png"),
);
fs.mkdirSync(path.join(output, "source", "scripts"), { recursive: true });
fs.copyFileSync(
  fileURLToPath(import.meta.url),
  path.join(output, "source", "scripts", "export-kulhat.mjs"),
);
fs.copyFileSync(
  path.join(root, "RELEASE-README.md"),
  path.join(output, "README.md"),
);
fs.copyFileSync(
  path.join(root, "RELEASE-README.md"),
  path.join(output, "source", "RELEASE-README.md"),
);
fs.writeFileSync(
  path.join(output, "source", "package.json"),
  JSON.stringify(
    {
      name: "kulhat-standalone",
      private: true,
      type: "module",
      scripts: {
        build: "node scripts/export-kulhat.mjs",
        test: "node --test tests/campaign.test.js tests/profile.test.js tests/audio.test.js tests/maps.test.js",
      },
    },
    null,
    2,
  ),
);
if (fs.existsSync(path.join(root, "tests", "campaign.test.js"))) {
  fs.mkdirSync(path.join(output, "source", "tests"), { recursive: true });
  for (const test of [
    "campaign.test.js",
    "profile.test.js",
    "audio.test.js",
    "maps.test.js",
    "pilot.js",
  ])
    fs.copyFileSync(
      path.join(root, "tests", test),
      path.join(output, "source", "tests", test),
    );
}
}
if (fs.existsSync(path.join(root, "docs", "validation-suite.json"))) {
  const qa = JSON.parse(
    fs.readFileSync(path.join(root, "docs", "validation-suite.json"), "utf8"),
  );
  fs.writeFileSync(
    path.join(output, "QA-REPORT.json"),
    JSON.stringify(
      {
        generated: qa.generated,
        checks: qa.coreSuites,
        courier: qa.courier,
        browserVisualQA: qa.browserVisualQA,
        realDeviceQA: qa.realDeviceQA,
        releaseReady: qa.releaseReady,
      },
      null,
      2,
    ),
  );
}
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else
      files.push({
        file: path.relative(output, file),
        bytes: fs.statSync(file).size,
      });
  }
}
walk(output);
const initial = files
  .filter((f) => !f.file.startsWith("source/") && f.file !== "README.md")
  .reduce((n, f) => n + f.bytes, 0);
if (initial >= 15000000) throw Error("Initial load exceeds 15 MB");
fs.writeFileSync(
  path.join(output, "BUILD-INFO.json"),
  JSON.stringify({ initialBytes: initial, files }, null, 2),
);
console.log(
  JSON.stringify({
    output,
    initialBytes: initial,
    totalBytes: files.reduce((n, f) => n + f.bytes, 0),
    modules: modules.size,
  }),
);
