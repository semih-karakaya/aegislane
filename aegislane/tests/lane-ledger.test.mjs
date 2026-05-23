import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { ensureMemory, pullRequestStatus, readLanes, registerLane, releaseLane, taskIntake } from "../runtime.mjs";

const execFileAsync = promisify(execFile);
const root = fs.mkdtempSync(path.join(os.tmpdir(), "aegislane-lanes-"));

ensureMemory(root);

const first = registerLane(root, {
  waveId: "implement-1",
  laneId: "lane-a",
  targetPaths: ["src/user.ts"],
  task: "edit user module",
});

assert.equal(first.ok, true);
assert.equal(first.registered, true);
assert.deepEqual(readLanes(root).lanes.map((lane) => lane.laneId), ["lane-a"]);

const conflict = registerLane(root, {
  waveId: "implement-1",
  laneId: "lane-b",
  targetPaths: ["src/user.ts"],
  task: "parallel edit same file",
});

assert.equal(conflict.ok, false);
assert.match(conflict.issues.join("\n"), /conflicts with lane-a/);

const disjoint = registerLane(root, {
  waveId: "implement-1",
  laneId: "lane-c",
  targetPaths: ["tests/user.test.ts"],
  task: "edit user tests",
});

assert.equal(disjoint.ok, true);
assert.equal(disjoint.registered, true);

const released = releaseLane(root, { laneId: "lane-a" });
assert.equal(released.ok, true);
assert.equal(released.released, true);

const afterRelease = registerLane(root, {
  waveId: "implement-2",
  laneId: "lane-b",
  targetPaths: ["src/user.ts"],
  task: "serial edit same file after release",
});

assert.equal(afterRelease.ok, true);
assert.equal(afterRelease.registered, true);

const raceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aegislane-lanes-race-"));
ensureMemory(raceRoot);

async function registerWithCli(laneId) {
  const cliPath = new URL("../cli.mjs", import.meta.url).pathname;
  try {
    const result = await execFileAsync(process.execPath, [
      cliPath,
      "register-lane",
      "--root",
      raceRoot,
      "--wave",
      "race-1",
      "--lane",
      laneId,
      "--paths",
      "src/race.ts",
    ]);
    return { exitCode: 0, body: JSON.parse(result.stdout) };
  } catch (error) {
    return { exitCode: error.code, body: JSON.parse(error.stdout) };
  }
}

const raceResults = await Promise.all([registerWithCli("lane-a"), registerWithCli("lane-b")]);
assert.equal(raceResults.filter((result) => result.body.ok).length, 1);
assert.equal(raceResults.filter((result) => !result.body.ok).length, 1);
assert.match(raceResults.find((result) => !result.body.ok).body.issues.join("\n"), /conflicts with lane-/);

const prRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aegislane-pr-"));
ensureMemory(prRoot);
const prStatus = pullRequestStatus(prRoot);
assert.equal(prStatus.ok, false);
assert.equal(prStatus.command, "/aegislane-pr");
assert.match(prStatus.issues.join("\n"), /not inside a git repository/);

const intakeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aegislane-intake-"));
ensureMemory(intakeRoot);
const intake = taskIntake(intakeRoot, "update README.md and run npm test");
assert.equal(intake.sourceOfTruth, "user_prompt");
assert.equal(intake.manualCurrentJsonEditRequired, false);
assert.deepEqual(intake.inferred.targetPaths, ["README.md"]);
assert.deepEqual(intake.inferred.requiredChecks, ["npm test"]);
assert.equal(intake.targetPathStatus[0].allowed, true);

const riskyIntake = taskIntake(intakeRoot, "fix auth login in src/auth.ts");
assert.deepEqual(riskyIntake.inferred.targetPaths, ["src/auth.ts"]);
assert.ok(riskyIntake.inferred.riskFlags.includes("auth"));
assert.equal(riskyIntake.inferred.needsClarification, true);
