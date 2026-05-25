#!/usr/bin/env node
import process from "node:process";
import {
  acquireLock,
  appendLog,
  diffPolicy,
  parseJsonPayload,
  preflight,
  pullRequestStatus,
  readCurrent,
  readLanes,
  readModels,
  readPhase,
  readSkillDiscoveryPolicy,
  readSubagents,
  registerLane,
  releaseLane,
  releaseLock,
  sanitize,
  status,
  taskIntake,
  validateMemory,
  writeReport,
  writeShiftNote,
} from "./runtime.mjs";

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      args._.push(item);
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function print(value) {
  process.stdout.write(`${JSON.stringify(sanitize(value), null, 2)}\n`);
}

function payloadFromArgs(args) {
  return {
    ...parseJsonPayload(args.payload, {}),
    task: args.task,
    summary: args.summary,
    event: args.event,
    status: args.status,
    nextStep: args["next-step"],
    handoff: args.handoff,
    risks: args.risk ? [args.risk] : undefined,
  };
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const root = args.root || process.cwd();

  switch (command) {
    case "status":
      print(status(root));
      return;
    case "acquire-lock":
      print(acquireLock(root, { task: args.task, executionProfile: args["execution-profile"] || args.profile, sessionID: args.session, agent: args.agent }));
      return;
    case "release-lock":
      print(releaseLock(root));
      return;
    case "preflight": {
      const result = preflight(root, { repair: Boolean(args.repair), allowExistingLock: Boolean(args["allow-existing-lock"]) });
      print(result);
      process.exitCode = result.ok ? 0 : 2;
      return;
    }
    case "validate-memory": {
      const result = validateMemory(root, { createMissing: args["no-create"] ? false : true });
      print(result);
      process.exitCode = result.ok ? 0 : 2;
      return;
    }
    case "read-current":
      print(readCurrent(root, { createMissing: true }));
      return;
    case "task-intake":
      print(taskIntake(root, args.task || args._.join(" "), { compact: !args.full }));
      return;
    case "read-phase":
      print(readPhase(root, args.phase));
      return;
    case "read-subagents":
      print(readSubagents(root, { createMissing: true }));
      return;
    case "read-lanes":
      print(readLanes(root, { createMissing: true }));
      return;
    case "read-skill-discovery":
      print(readSkillDiscoveryPolicy(root, { createMissing: true }));
      return;
    case "read-models":
      print(readModels(root, { createMissing: true }));
      return;
    case "register-lane": {
      const result = registerLane(root, {
        waveId: args.wave,
        laneId: args.lane,
        targetPaths: args.paths,
        task: args.task,
        subagent: args.subagent,
        sessionID: args.session,
        agent: args.agent,
      });
      print(result);
      process.exitCode = result.ok ? 0 : 2;
      return;
    }
    case "release-lane": {
      const result = releaseLane(root, {
        waveId: args.wave,
        laneId: args.lane,
        all: Boolean(args.all),
        status: args.status,
      });
      print(result);
      process.exitCode = result.ok ? 0 : 2;
      return;
    }
    case "diff-policy": {
      const result = diffPolicy(root, { changedFile: args["changed-file"] });
      print(result);
      process.exitCode = result.ok ? 0 : 2;
      return;
    }
    case "pr-status": {
      const result = pullRequestStatus(root, { force: Boolean(args.force) });
      print(result);
      process.exitCode = result.ok ? 0 : 2;
      return;
    }
    case "report":
      print(writeReport(root, payloadFromArgs(args)));
      return;
    case "shift-note":
      print(writeShiftNote(root, payloadFromArgs(args)));
      return;
    case "append-log":
      print(appendLog(root, payloadFromArgs(args)));
      return;
    default:
      process.stderr.write(`Usage: node aegislane/cli.mjs <status|acquire-lock|release-lock|preflight|validate-memory|task-intake|read-current|read-phase|read-subagents|read-lanes|read-skill-discovery|read-models|register-lane|release-lane|diff-policy|pr-status|report|shift-note|append-log> [--key value]\n`);
      process.exitCode = 64;
  }
}

main().catch((error) => {
  print({ ok: false, error: error.message, details: error.details || undefined });
  process.exitCode = 1;
});
