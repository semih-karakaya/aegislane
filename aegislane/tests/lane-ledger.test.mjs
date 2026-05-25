import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import * as runtime from "../runtime.mjs";
import { acquireLock, ensureMemory, pullRequestStatus, readLanes, readLock, registerLane, releaseLane, releaseLock, taskIntake } from "../runtime.mjs";

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

const verified = releaseLane(root, { laneId: "lane-c", status: "verified" });
assert.equal(verified.ok, true);
assert.equal(verified.released, true);

const afterVerified = registerLane(root, {
  waveId: "implement-2",
  laneId: "lane-d",
  targetPaths: ["tests/user.test.ts"],
  task: "reuse target after verified lane",
});

assert.equal(afterVerified.ok, true);
assert.equal(afterVerified.registered, true);

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
assert.equal(intake.inferred.executionProfile, "fast");
assert.equal(intake.inferred.fastPathEligible, true);

const compactIntake = taskIntake(intakeRoot, "update README.md and run npm test", { compact: true });
assert.equal(compactIntake.ok, true);
assert.equal(compactIntake.profile, "fast");
assert.deepEqual(compactIntake.targets, ["README.md"]);
assert.equal(compactIntake.guardrails, undefined);
assert.ok(JSON.stringify(compactIntake).length < JSON.stringify(intake).length / 2);

const shortFastIntake = taskIntake(intakeRoot, "fix README.md");
assert.equal(shortFastIntake.inferred.needsClarification, false);
assert.equal(shortFastIntake.inferred.executionProfile, "fast");

const vagueCodeIntake = taskIntake(intakeRoot, "fix bug in src/user.ts");
assert.equal(vagueCodeIntake.inferred.executionProfile, "fast");
assert.equal(vagueCodeIntake.inferred.fastPathEligible, true);

const parallelIntake = taskIntake(
  intakeRoot,
  "fix loading bugs in src/settings.ts and tests/settings.test.ts",
);
assert.equal(parallelIntake.inferred.executionProfile, "fast");
assert.equal(parallelIntake.parallelPlan.mode, "direct");
assert.equal(parallelIntake.parallelPlan.maxConcurrentLanes, 0);

const standardParallelIntake = taskIntake(
  intakeRoot,
  "fix bugs in src/a.ts src/b.ts tests/a.test.ts",
);
assert.equal(standardParallelIntake.inferred.executionProfile, "standard");
assert.equal(standardParallelIntake.parallelPlan.mode, "parallel-implementer-wave");
assert.equal(standardParallelIntake.parallelPlan.maxConcurrentLanes, 3);

const multiTargetStandardIntake = taskIntake(
  intakeRoot,
  "refactor helpers in src/a.ts and src/b.ts",
);
assert.equal(multiTargetStandardIntake.inferred.executionProfile, "guarded");
assert.equal(multiTargetStandardIntake.parallelPlan.mode, "parallel-readonly-then-serial-or-lanes");
assert.deepEqual(multiTargetStandardIntake.parallelPlan.targetPaths, ["src/a.ts", "src/b.ts"]);

const riskyIntake = taskIntake(intakeRoot, "fix auth login in src/auth.ts");
assert.deepEqual(riskyIntake.inferred.targetPaths, ["src/auth.ts"]);
assert.ok(riskyIntake.inferred.riskFlags.includes("auth"));
assert.equal(riskyIntake.inferred.needsClarification, true);
assert.equal(riskyIntake.inferred.executionProfile, "guarded");

const lockRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aegislane-lock-profile-"));
ensureMemory(lockRoot);
const fastLock = acquireLock(lockRoot, {
  task: "fix README.md",
  executionProfile: "fast",
  agent: "aegislane",
});
assert.equal(fastLock.ok, true);
assert.equal(readLock(lockRoot).executionProfile, "fast");
assert.equal(releaseLock(lockRoot).released, true);

assert.equal(typeof runtime.shouldLogHostEvent, "function");
assert.equal(runtime.shouldLogHostEvent("file.watcher.updated"), false);
assert.equal(runtime.shouldLogHostEvent("vcs.branch.updated", { sessionID: "s1", trackedSession: true }), false);
assert.equal(runtime.shouldLogHostEvent("session.done", { sessionID: "s1", trackedSession: true }), true);
assert.equal(runtime.shouldLogHostEvent("message.created", { sessionID: "s1", trackedSession: true }), true);
assert.equal(runtime.shouldLogHostEvent("message.created"), false);
