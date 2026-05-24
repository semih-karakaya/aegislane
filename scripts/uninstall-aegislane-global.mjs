#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const HOME = os.homedir();
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const target = [...args].find((arg) => !arg.startsWith("--")) || "all";

const targets = {
  opencode: process.env.OPENCODE_CONFIG_DIR || path.join(HOME, ".config", "opencode"),
  kilo: process.env.KILO_CONFIG_DIR || path.join(HOME, ".config", "kilo"),
};

function listEntries(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function removePath(file, removed) {
  if (!fs.existsSync(file)) return;
  removed.push(file);
  if (!dryRun) fs.rmSync(file, { recursive: true, force: true });
}

function removeNamed(dir, names, removed) {
  for (const name of names) removePath(path.join(dir, name), removed);
}

function removeByPrefix(dir, prefix, removed) {
  for (const entry of listEntries(dir)) {
    if (entry.name.startsWith(prefix)) removePath(path.join(dir, entry.name), removed);
  }
}

function removeOpencode(configDir) {
  const removed = [];
  removeByPrefix(path.join(configDir, "agents"), "aegislane", removed);
  removeByPrefix(path.join(configDir, "commands"), "aegislane", removed);
  removeByPrefix(path.join(configDir, "plugins"), "aegislane", removed);
  removeByPrefix(path.join(configDir, "tools"), "aegislane", removed);
  removeNamed(path.join(configDir, "skills"), ["aegislane-skill-finder", "aegislane-grill-me"], removed);
  removePath(path.join(configDir, "aegislane"), removed);
  return removed;
}

function removeKilo(configDir) {
  const removed = [];
  removeByPrefix(path.join(configDir, "agent"), "aegislane", removed);
  removeByPrefix(path.join(configDir, "commands"), "aegislane", removed);
  removeByPrefix(path.join(configDir, "plugin"), "aegislane", removed);
  removeNamed(path.join(configDir, "skills"), ["aegislane-skill-finder", "aegislane-grill-me"], removed);
  removePath(path.join(configDir, "aegislane"), removed);
  return removed;
}

function main() {
  if (!["all", "opencode", "kilo"].includes(target)) {
    throw new Error("Usage: node scripts/uninstall-aegislane-global.mjs [all|opencode|kilo] [--dry-run]");
  }

  const results = [];
  if (target === "all" || target === "opencode") {
    results.push({ target: "opencode", configDir: targets.opencode, removed: removeOpencode(targets.opencode) });
  }
  if (target === "all" || target === "kilo") {
    results.push({ target: "kilo", configDir: targets.kilo, removed: removeKilo(targets.kilo) });
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        dryRun,
        results,
        note: "Removed AegisLane-installed global agent, command, plugin, tool, skill, and runtime files. Shared host config files are left in place.",
      },
      null,
      2,
    )}\n`,
  );
}

main();
