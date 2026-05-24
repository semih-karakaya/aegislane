#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const DEFAULT_SOURCE = "https://github.com/semih-karakaya/aegislane.git";
const HOME = os.homedir();

function parseArgs(argv) {
  const options = {
    target: "all",
    source: process.env.AEGISLANE_SOURCE || DEFAULT_SOURCE,
    ref: process.env.AEGISLANE_REF || "main",
    cacheDir: process.env.AEGISLANE_UPDATE_CACHE || path.join(HOME, ".cache", "aegislane", "source"),
    dryRun: false,
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (["all", "opencode", "kilo", "status"].includes(arg)) {
      options.target = arg;
    } else if (arg === "--source") {
      options.source = argv[++index];
    } else if (arg === "--ref") {
      options.ref = argv[++index];
    } else if (arg === "--cache") {
      options.cacheDir = argv[++index];
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--force") {
      options.force = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function git(args, cwd) {
  return run("git", args, cwd);
}

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function configDir(target) {
  if (target === "opencode") return process.env.OPENCODE_CONFIG_DIR || path.join(HOME, ".config", "opencode");
  if (target === "kilo") return process.env.KILO_CONFIG_DIR || path.join(HOME, ".config", "kilo");
  throw new Error(`Unknown host target: ${target}`);
}

function installMetadata(target) {
  return readJson(path.join(configDir(target), "aegislane", "install.json"));
}

function selectedTargets(target) {
  if (target === "all" || target === "status") return ["opencode", "kilo"];
  return [target];
}

function remoteHead(source, ref) {
  const refs = ref.startsWith("refs/") ? [ref] : [`refs/heads/${ref}`, `refs/tags/${ref}`, ref];
  for (const candidate of refs) {
    try {
      const output = git(["ls-remote", source, candidate], process.cwd());
      const line = output.split(/\r?\n/).find(Boolean);
      if (line) {
        const [commit, remoteRef] = line.split(/\s+/);
        return { commit, shortCommit: commit.slice(0, 7), ref: remoteRef || candidate };
      }
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

function ensureRepo(options) {
  fs.mkdirSync(path.dirname(options.cacheDir), { recursive: true });

  if (fs.existsSync(options.cacheDir) && !fs.existsSync(path.join(options.cacheDir, ".git"))) {
    fs.rmSync(options.cacheDir, { recursive: true, force: true });
  }

  if (!fs.existsSync(path.join(options.cacheDir, ".git"))) {
    git(["clone", options.source, options.cacheDir], path.dirname(options.cacheDir));
  } else {
    git(["remote", "set-url", "origin", options.source], options.cacheDir);
  }

  fetchRef(options);
  git(["checkout", "--detach", "FETCH_HEAD"], options.cacheDir);

  const commit = git(["rev-parse", "HEAD"], options.cacheDir);
  const packageJson = readJson(path.join(options.cacheDir, "package.json")) || {};
  return {
    dir: options.cacheDir,
    version: packageJson.version || null,
    commit,
    shortCommit: commit.slice(0, 7),
  };
}

function fetchRef(options) {
  const refs = options.ref.startsWith("refs/")
    ? [options.ref]
    : [options.ref, `refs/heads/${options.ref}`, `refs/tags/${options.ref}`];
  let lastError = null;
  for (const ref of refs) {
    try {
      git(["fetch", "--tags", "--prune", "origin", ref], options.cacheDir);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`Could not fetch ref: ${options.ref}`);
}

function npmInstall(repoDir) {
  if (fs.existsSync(path.join(repoDir, "package-lock.json"))) {
    run("npm", ["ci", "--ignore-scripts"], repoDir);
  } else {
    run("npm", ["install", "--ignore-scripts"], repoDir);
  }
}

function runInstaller(repo, target, options) {
  const script =
    target === "opencode" ? "scripts/install-aegislane-global.mjs" : "scripts/install-aegislane-kilo-global.mjs";
  const output = execFileSync(process.execPath, [script], {
    cwd: repo.dir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      AEGISLANE_UPDATE_SOURCE: options.source,
      AEGISLANE_UPDATE_REF: options.ref,
      AEGISLANE_UPDATE_COMMIT: repo.commit,
    },
  }).trim();
  return JSON.parse(output);
}

function statusPayload(options) {
  const remote = remoteHead(options.source, options.ref);
  return {
    ok: true,
    source: options.source,
    ref: options.ref,
    remote,
    installed: Object.fromEntries(selectedTargets(options.target).map((target) => [target, installMetadata(target)])),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.target === "status" || options.dryRun) {
    const status = statusPayload(options);
    process.stdout.write(`${JSON.stringify({ ...status, dryRun: options.dryRun }, null, 2)}\n`);
    if (options.target === "status") return;
  }

  if (options.dryRun) return;

  const before = Object.fromEntries(selectedTargets(options.target).map((target) => [target, installMetadata(target)]));
  const repo = ensureRepo(options);
  npmInstall(repo.dir);

  const installations = {};
  for (const target of selectedTargets(options.target)) {
    const current = before[target];
    const upToDate = current?.commit === repo.commit && current?.version === repo.version;
    if (upToDate && !options.force) {
      installations[target] = { ok: true, skipped: true, reason: "already up to date" };
    } else {
      installations[target] = runInstaller(repo, target, options);
    }
  }

  const after = Object.fromEntries(selectedTargets(options.target).map((target) => [target, installMetadata(target)]));
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        source: options.source,
        ref: options.ref,
        cacheDir: repo.dir,
        version: repo.version,
        commit: repo.commit,
        before,
        installations,
        after,
      },
      null,
      2,
    )}\n`,
  );
}

main();
