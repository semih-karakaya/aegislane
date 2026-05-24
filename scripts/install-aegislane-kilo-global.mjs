#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const HOME = os.homedir();
const KILO_CONFIG_DIR = path.join(HOME, ".config", "kilo");

function file(...parts) {
  return path.join(...parts);
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function stripJsonComments(input) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function readJsonc(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const text = fs.readFileSync(filePath, "utf8");
  return JSON.parse(stripJsonComments(text));
}

function writeJsonc(filePath, value, results) {
  const next = `${JSON.stringify(value, null, 2)}\n`;
  if (fs.existsSync(filePath)) {
    const current = fs.readFileSync(filePath, "utf8");
    if (current === next) {
      results.push({ file: filePath, action: "unchanged" });
      return;
    }
    const backup = `${filePath}.bak-${timestamp()}`;
    fs.copyFileSync(filePath, backup);
    fs.writeFileSync(filePath, next);
    results.push({ file: filePath, action: "updated", backup });
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, next);
  results.push({ file: filePath, action: "created" });
}

function copyIfChanged(source, target, results) {
  if (!fs.existsSync(source)) throw new Error(`Missing source file: ${source}`);
  const next = fs.readFileSync(source);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) {
    const current = fs.readFileSync(target);
    if (Buffer.compare(current, next) === 0) {
      results.push({ file: target, action: "unchanged" });
      return;
    }
    const backup = `${target}.bak-${timestamp()}`;
    fs.copyFileSync(target, backup);
    fs.writeFileSync(target, next);
    results.push({ file: target, action: "updated", backup });
    return;
  }
  fs.writeFileSync(target, next);
  results.push({ file: target, action: "created" });
}

function copyDirFiles(sourceDir, targetDir, results) {
  if (!fs.existsSync(sourceDir)) return;
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const source = file(sourceDir, entry.name);
    const target = file(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirFiles(source, target, results);
    } else if (entry.isFile()) {
      copyIfChanged(source, target, results);
    }
  }
}

function gitValue(args) {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function installMetadata() {
  const packageJson = JSON.parse(fs.readFileSync(file(ROOT, "package.json"), "utf8"));
  return {
    name: "aegislane",
    host: "kilo",
    version: packageJson.version,
    source: process.env.AEGISLANE_UPDATE_SOURCE || gitValue(["remote", "get-url", "origin"]),
    sourcePath: ROOT,
    ref: process.env.AEGISLANE_UPDATE_REF || gitValue(["branch", "--show-current"]) || "detached",
    commit: process.env.AEGISLANE_UPDATE_COMMIT || gitValue(["rev-parse", "HEAD"]),
    installedAt: new Date().toISOString(),
    installerVersion: 1,
  };
}

function mergeUnique(existing = [], additions = []) {
  const output = [];
  for (const item of [...existing, ...additions]) {
    if (typeof item !== "string" || item.length === 0) continue;
    if (!output.includes(item)) output.push(item);
  }
  return output;
}

function discoverCodexPluginSkillPaths() {
  const root = file(HOME, ".codex", "plugins", "cache");
  const found = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const candidate = file(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "skills") {
          found.push(candidate);
        } else {
          walk(candidate);
        }
      }
    }
  }
  walk(root);
  return found.sort();
}

function mergeKiloConfig(results) {
  const configPath = file(KILO_CONFIG_DIR, "kilo.jsonc");
  const config = readJsonc(configPath);

  config.$schema = config.$schema || "https://app.kilo.ai/config.json";

  config.skills = config.skills || {};
  config.skills.paths = mergeUnique(config.skills.paths, [
    "~/.config/kilo/skills",
    file(KILO_CONFIG_DIR, "skills"),
    file(HOME, ".kilo", "skills"),
    file(HOME, ".agents", "skills"),
    file(HOME, ".codex", "skills"),
    file(HOME, ".codex", "skills", ".system"),
    ...discoverCodexPluginSkillPaths(),
  ]);

  config.mcp = config.mcp || {};
  config.mcp.context7 = config.mcp.context7 || {
    type: "remote",
    url: "https://mcp.context7.com/mcp",
    enabled: true,
  };
  config.mcp.gh_grep = config.mcp.gh_grep || {
    type: "remote",
    url: "https://mcp.grep.app",
    enabled: true,
  };

  config.permission = config.permission || {};
  if (typeof config.permission === "object" && !Array.isArray(config.permission)) {
    config.permission.skill = config.permission.skill || { "*": "allow" };
    if (typeof config.permission.bash === "object" && config.permission.bash !== null) {
      config.permission.bash = {
        ...config.permission.bash,
        "npx skills find*": config.permission.bash["npx skills find*"] || "allow",
        "npx skills check*": config.permission.bash["npx skills check*"] || "allow",
        "npx skills add*": config.permission.bash["npx skills add*"] || "allow",
        "node aegislane/cli.mjs *": config.permission.bash["node aegislane/cli.mjs *"] || "allow",
      };
    }
  }

  writeJsonc(configPath, config, results);
}

function mergeKiloPackage(results) {
  const packagePath = file(KILO_CONFIG_DIR, "package.json");
  const current = fs.existsSync(packagePath) ? JSON.parse(fs.readFileSync(packagePath, "utf8")) : {};
  const next = {
    ...current,
    type: current.type || "module",
    dependencies: {
      ...(current.dependencies || {}),
      "@kilocode/plugin": (current.dependencies || {})["@kilocode/plugin"] || "latest",
    },
  };
  writeJsonc(packagePath, next, results);
}

function main() {
  const results = [];

  copyDirFiles(file(ROOT, ".kilo", "agents"), file(KILO_CONFIG_DIR, "agent"), results);
  copyDirFiles(file(ROOT, ".kilo", "commands"), file(KILO_CONFIG_DIR, "commands"), results);
  copyDirFiles(file(ROOT, ".kilo", "skills"), file(KILO_CONFIG_DIR, "skills"), results);
  copyDirFiles(file(ROOT, ".kilo", "plugin"), file(KILO_CONFIG_DIR, "plugin"), results);
  mergeKiloPackage(results);
  copyIfChanged(file(ROOT, "aegislane", "runtime.mjs"), file(KILO_CONFIG_DIR, "aegislane", "runtime.mjs"), results);
  copyIfChanged(file(ROOT, "aegislane", "cli.mjs"), file(KILO_CONFIG_DIR, "aegislane", "cli.mjs"), results);
  copyIfChanged(file(ROOT, "scripts", "update-aegislane-global.mjs"), file(KILO_CONFIG_DIR, "aegislane", "update.mjs"), results);
  copyIfChanged(file(ROOT, "scripts", "uninstall-aegislane-global.mjs"), file(KILO_CONFIG_DIR, "aegislane", "uninstall.mjs"), results);
  writeJsonc(file(KILO_CONFIG_DIR, "aegislane", "install.json"), installMetadata(), results);
  mergeKiloConfig(results);

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        configDir: KILO_CONFIG_DIR,
        results,
        note: "AegisLane is installed as a global Kilo Code primary agent, commands, plugin, and tools. Restart VS Code/Kilo Code, then select the aegislane mode.",
      },
      null,
      2,
    )}\n`,
  );
}

main();
