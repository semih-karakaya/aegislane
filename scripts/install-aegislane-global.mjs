#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const configDir = process.env.OPENCODE_CONFIG_DIR || path.join(os.homedir(), ".config", "opencode");
const stamp = new Date().toISOString().replace(/[-:.]/g, "").replace("T", "T").slice(0, 15);
const globalSkillPaths = [
  path.join(configDir, "skills"),
  path.join(os.homedir(), ".agents", "skills"),
  path.join(os.homedir(), ".codex", "skills"),
  path.join(os.homedir(), ".codex", "skills", ".system"),
];

function existingDir(dir) {
  return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
}

function discoverCodexPluginSkillPaths() {
  const cache = path.join(os.homedir(), ".codex", "plugins", "cache");
  const found = [];
  if (!existingDir(cache)) return found;
  const stack = [cache];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const child = path.join(current, entry.name);
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      if (entry.name === "skills") {
        found.push(child);
        continue;
      }
      stack.push(child);
    }
  }
  return found.sort();
}

const resolvedSkillPaths = [...new Set([...globalSkillPaths, ...discoverCodexPluginSkillPaths()])];

function src(...parts) {
  return path.join(root, ...parts);
}

function dest(...parts) {
  return path.join(configDir, ...parts);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function readJson(file) {
  return JSON.parse(read(file));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeChanged(file, content) {
  ensureDir(path.dirname(file));
  if (fs.existsSync(file)) {
    const current = read(file);
    if (current === content) return { file, action: "unchanged" };
    const backup = `${file}.bak-${stamp}`;
    fs.copyFileSync(file, backup);
    fs.writeFileSync(file, content);
    return { file, action: "updated", backup };
  }
  fs.writeFileSync(file, content);
  return { file, action: "created" };
}

function installText(relativeSource, relativeDest, transform = (value) => value) {
  return writeChanged(dest(relativeDest), transform(read(src(relativeSource))));
}

function installJson(file, updater) {
  const target = dest(file);
  let data = {};
  if (fs.existsSync(target)) {
    data = JSON.parse(read(target));
  }
  const updated = updater(data);
  return writeChanged(target, `${JSON.stringify(updated, null, 2)}\n`);
}

function globalizeRuntimeImport(content) {
  return content.replaceAll("../../aegislane/runtime.mjs", "../aegislane/runtime.mjs");
}

function gitValue(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function installMetadata() {
  const packageJson = readJson(src("package.json"));
  return {
    name: "aegislane",
    host: "opencode",
    version: packageJson.version,
    source: process.env.AEGISLANE_UPDATE_SOURCE || gitValue(["remote", "get-url", "origin"]),
    sourcePath: root,
    ref: process.env.AEGISLANE_UPDATE_REF || gitValue(["branch", "--show-current"]) || "detached",
    commit: process.env.AEGISLANE_UPDATE_COMMIT || gitValue(["rev-parse", "HEAD"]),
    installedAt: new Date().toISOString(),
    installerVersion: 1,
  };
}

const results = [];

for (const dir of ["agents", "commands", "plugins", "tools", "aegislane"]) {
  ensureDir(dest(dir));
}

for (const name of [
  "aegislane.md",
  "aegislane-explorer.md",
  "aegislane-architect.md",
  "aegislane-implementer.md",
  "aegislane-publisher.md",
  "aegislane-reviewer.md",
  "aegislane-tester.md",
  "aegislane-docs.md",
]) {
  results.push(installText(`.opencode/agents/${name}`, `agents/${name}`));
}

results.push(installText(".opencode/commands/aegislane.md", "commands/aegislane.md"));
results.push(installText(".opencode/commands/aegislane-pr.md", "commands/aegislane-pr.md"));
results.push(installText(".opencode/commands/aegislane-grill.md", "commands/aegislane-grill.md"));
results.push(installText(".opencode/skills/aegislane-skill-finder/SKILL.md", "skills/aegislane-skill-finder/SKILL.md"));
results.push(installText(".opencode/skills/aegislane-grill-me/SKILL.md", "skills/aegislane-grill-me/SKILL.md"));
results.push(installText(".opencode/skills/karpathy-guidelines/SKILL.md", "skills/karpathy-guidelines/SKILL.md"));
results.push(installText(".opencode/plugins/aegislane.ts", "plugins/aegislane.ts", globalizeRuntimeImport));
results.push(installText(".opencode/tools/aegislane.ts", "tools/aegislane.ts", globalizeRuntimeImport));
results.push(installText("aegislane/runtime.mjs", "aegislane/runtime.mjs"));
results.push(installText("aegislane/cli.mjs", "aegislane/cli.mjs"));
results.push(installText("scripts/update-aegislane-global.mjs", "aegislane/update.mjs"));
results.push(installText("scripts/uninstall-aegislane-global.mjs", "aegislane/uninstall.mjs"));
results.push(writeChanged(dest("aegislane/install.json"), `${JSON.stringify(installMetadata(), null, 2)}\n`));

results.push(
  installJson("opencode.jsonc", (config) => ({
    ...config,
    $schema: config.$schema || "https://opencode.ai/config.json",
    skills: {
      ...(config.skills || {}),
      paths: [...new Set([...(config.skills?.paths || []), ...resolvedSkillPaths])],
    },
    mcp: {
      ...(config.mcp || {}),
      context7: {
        ...(config.mcp?.context7 || {}),
        type: "remote",
        url: "https://mcp.context7.com/mcp",
        enabled: true,
      },
      gh_grep: {
        ...(config.mcp?.gh_grep || {}),
        type: "remote",
        url: "https://mcp.grep.app",
        enabled: true,
      },
    },
    permission: {
      ...(config.permission || {}),
      skill: {
        ...(typeof config.permission?.skill === "object" ? config.permission.skill : {}),
        "*": "allow",
      },
      bash: {
        ...(typeof config.permission?.bash === "object" ? config.permission.bash : {}),
        "npx skills find*": "allow",
        "npx skills check*": "allow",
        "npx skills add*": "allow",
      },
    },
  })),
);

results.push(
  installJson("package.json", (pkg) => ({
    ...pkg,
    dependencies: {
      ...(pkg.dependencies || {}),
      "@opencode-ai/plugin": pkg.dependencies?.["@opencode-ai/plugin"] || "1.15.10",
    },
  })),
);

process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      configDir,
      results,
      note: "AegisLane is installed as a global OpenCode primary agent, command, plugin, and tools. Select the aegislane agent like plan/build.",
    },
    null,
    2,
  )}\n`,
);
