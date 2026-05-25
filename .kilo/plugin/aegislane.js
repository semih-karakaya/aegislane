import { existsSync } from "node:fs";
import os from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AEGISLANE_COMMAND = /(^|\s)\/?aegislane(\s|$)/i;
const DENIED_BASH_PATTERNS = [
  /\bgit\s+(commit|push|merge|rebase|reset)\b/i,
  /\b(?:npm|pnpm|yarn|bun)\s+(?:publish|run\s+(?:deploy|release))\b/i,
  /\b(?:vercel|netlify|firebase)\s+deploy\b/i,
  /\b(?:rm|mv|cp|cat|less|more|sed|awk|vim|nano|code)\b[^\n]*(?:\.env|\.pem|\.key|\.p12|mobileprovision|api-key|apikey|token|GoogleService-Info\.plist|google-services\.json)/i,
];

async function loadRuntime() {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "../../aegislane/runtime.mjs"),
    resolve(here, "../aegislane/runtime.mjs"),
    resolve(process.cwd(), "aegislane/runtime.mjs"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return import(pathToFileURL(candidate).href);
  }
  throw new Error(`AegisLane runtime not found. Tried: ${candidates.join(", ")}`);
}

async function loadToolHelper() {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    "@kilocode/plugin/tool",
    pathToFileURL(resolve(here, "../node_modules/@kilocode/plugin/dist/tool.js")).href,
    pathToFileURL(resolve(os.homedir(), ".config/kilo/node_modules/@kilocode/plugin/dist/tool.js")).href,
    pathToFileURL(resolve(os.homedir(), ".kilo/node_modules/@kilocode/plugin/dist/tool.js")).href,
  ];
  const errors = [];
  for (const candidate of candidates) {
    try {
      return await import(candidate);
    } catch (error) {
      errors.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Unable to load @kilocode/plugin/tool. ${errors.join(" | ")}`);
}

function rootFromContext(context) {
  return context?.worktree || context?.directory || process.cwd();
}

function output(runtime, value) {
  return JSON.stringify(runtime.sanitize(value), null, 2);
}

function payloadFromArgs(runtime, args) {
  const payload = runtime.parseJsonPayload(args.payloadJson, {});
  for (const key of ["task", "summary", "event", "status", "nextStep", "handoff"]) {
    if (args[key] !== undefined) payload[key] = args[key];
  }
  if (args.risk) payload.risks = [args.risk];
  return payload;
}

function compactCurrent(current) {
  return {
    version: current.version,
    activePhase: current.activePhase,
    status: current.status,
    limits: {
      maxFilesChanged: current.maxFilesChanged,
      maxLinesChanged: current.maxLinesChanged,
      maxSafeStepMinutes: current.maxSafeStepMinutes,
    },
    parallelWork: current.parallelWork,
    executionProfiles: current.executionProfiles,
    requiredChecks: current.requiredChecks,
    policyRefs: {
      current: "aegislane/state/current.json",
      protectedPaths: "aegislane/policies/protected-paths.json",
      diffPolicy: "aegislane/policies/diff-policy.json",
    },
  };
}

function compactPhase(phase) {
  return {
    activePhase: phase.activePhase,
    path: phase.path,
    summary: String(phase.content || "")
      .split("\n")
      .filter((line) => /^#|^- /.test(line))
      .slice(0, 16)
      .join("\n"),
  };
}

function compactSubagents(registry) {
  return {
    version: registry.version,
    subagents: (registry.subagents || [])
      .filter((agent) => agent.enabled !== false)
      .map((agent) => ({
        id: agent.id,
        opencodeAgent: agent.opencodeAgent,
        kiloAgent: agent.kiloAgent || agent.opencodeAgent,
        mode: agent.mode,
        parallelSafe: agent.parallelSafe,
        targetPathsRequired: agent.targetPathsRequired,
        steps: agent.steps,
      })),
  };
}

function compactSkillDiscovery(policy) {
  return {
    version: policy.version,
    enabled: policy.enabled,
    loadRequiredEveryRun: policy.loadRequiredEveryRun,
    requiredSkills: policy.requiredSkills || [],
    searchWhenMissing: policy.searchWhenMissing,
    autoInstall: policy.autoInstall
      ? {
          enabled: policy.autoInstall.enabled,
          maxInstallsPerRun: policy.autoInstall.maxInstallsPerRun,
          requireTrustedSource: policy.autoInstall.requireTrustedSource,
        }
      : undefined,
  };
}

function compactModels(models) {
  return {
    version: models.version,
    defaults: models.defaults,
    agents: Object.fromEntries(
      Object.entries(models.agents || {}).map(([name, config]) => [
        name,
        {
          model: config.model,
          reasoningEffort: config.reasoningEffort,
          steps: config.steps,
        },
      ]),
    ),
  };
}

function sessionIDFrom(value) {
  return (
    value?.sessionID ||
    value?.session?.id ||
    value?.properties?.sessionID ||
    value?.properties?.session?.id ||
    value?.data?.sessionID ||
    value?.data?.session?.id ||
    null
  );
}

function toolNameFrom(input, hookOutput) {
  return String(hookOutput?.tool || hookOutput?.name || input?.tool || input?.name || "");
}

function argsFrom(input, hookOutput) {
  return hookOutput?.args || input?.args || {};
}

function agentNameFrom(input, hookOutput) {
  return String(
    hookOutput?.agent ||
      input?.agent ||
      hookOutput?.context?.agent ||
      input?.context?.agent ||
      hookOutput?.properties?.agent ||
      input?.properties?.agent ||
      "",
  );
}

function extractPathArgs(runtime, toolName, args) {
  const paths = new Set();
  if (/apply_patch/i.test(toolName)) {
    for (const patchPath of runtime.extractPatchPaths(args.patchText || args.patch || "")) paths.add(patchPath);
  }
  for (const key of ["filePath", "filepath", "path", "file", "target", "absolutePath"]) {
    if (typeof args[key] === "string") paths.add(args[key]);
  }
  if (Array.isArray(args.files)) {
    for (const item of args.files) if (typeof item === "string") paths.add(item);
  }
  return [...paths];
}

function isEditTool(toolName) {
  return /(^|\.)(write|edit|apply_patch)$/i.test(toolName) || /apply_patch/i.test(toolName);
}

function isReadTool(toolName) {
  return /(^|\.)(read)$/i.test(toolName);
}

function isTaskTool(toolName) {
  return /(^|\.)(task)$/i.test(toolName) || /^task$/i.test(toolName);
}

function assertPrimaryEditAllowed(runtime, root, agentName, toolName, paths) {
  if (!isEditTool(toolName) || !/^aegislane$/i.test(agentName)) return;
  const lock = runtime.readLock(root);
  if (!lock || lock.owner !== "aegislane" || lock.executionProfile !== "fast") {
    throw new Error("AegisLane primary edits require an active fast-path lock. Use aegislane_acquire_lock with executionProfile=fast or delegate to aegislane-implementer.");
  }
  if (!paths.length) {
    throw new Error("AegisLane primary fast-path edits require explicit file paths so guards can verify allowedPaths and protectedPaths.");
  }
}

function inspectPaths(runtime, root, toolName, paths) {
  const edit = isEditTool(toolName);
  const read = isReadTool(toolName);
  if (!edit && !read) return;

  const blocked = [];
  for (const candidate of paths) {
    const classified = runtime.classifyPath(root, candidate);
    if (classified.protected) {
      blocked.push(`${classified.path} is protected`);
    } else if (edit && !classified.allowed) {
      blocked.push(`${classified.path} is outside allowedPaths`);
    }
  }

  if (blocked.length) {
    throw new Error(`AegisLane blocked ${toolName}: ${blocked.join("; ")}`);
  }
}

function inspectBash(command) {
  if (!command) return;
  for (const pattern of DENIED_BASH_PATTERNS) {
    if (pattern.test(command)) {
      throw new Error("AegisLane blocked bash command because it matches a protected-path, commit/push/merge, or deploy guard.");
    }
  }
}

function shouldMarkAegisLane(runtime, event) {
  const payload = JSON.stringify(runtime.sanitize(event || {}));
  return AEGISLANE_COMMAND.test(payload) || /"agent"\s*:\s*"aegislane"/i.test(payload);
}

function tools(runtime, tool) {
  return {
    aegislane_status: tool({
      description: "Show AegisLane memory, active phase, lock, and enabled subagent status.",
      args: {},
      async execute(_args, context) {
        return output(runtime, runtime.status(rootFromContext(context)));
      },
    }),

    aegislane_acquire_lock: tool({
      description: "Acquire aegislane/state/run.lock. Fails if another AegisLane run is active.",
      args: {
        task: tool.schema.string().describe("Short task description for the lock metadata.").optional(),
        executionProfile: tool.schema.string().describe("Optional execution profile, such as fast, standard, or guarded.").optional(),
      },
      async execute(args, context) {
        return output(
          runtime,
          runtime.acquireLock(rootFromContext(context), {
            task: args.task,
            executionProfile: args.executionProfile,
            sessionID: context?.sessionID || context?.session?.id,
            agent: context?.agent || "aegislane",
          }),
        );
      },
    }),

    aegislane_release_lock: tool({
      description: "Release aegislane/state/run.lock if it exists.",
      args: {},
      async execute(_args, context) {
        return output(runtime, runtime.releaseLock(rootFromContext(context)));
      },
    }),

    aegislane_preflight: tool({
      description: "Validate AegisLane memory and check whether a lock is already present.",
      args: {
        repair: tool.schema.boolean().describe("Create missing default AegisLane memory files before validation.").optional(),
        allowExistingLock: tool.schema.boolean().describe("Allow preflight to pass when run.lock exists.").optional(),
      },
      async execute(args, context) {
        return output(runtime, runtime.preflight(rootFromContext(context), { repair: args.repair, allowExistingLock: args.allowExistingLock }));
      },
    }),

    aegislane_validate_memory: tool({
      description: "Validate AegisLane project memory and optionally create safe missing defaults.",
      args: {
        createMissing: tool.schema.boolean().describe("Create safe default files when required memory files are missing.").optional(),
      },
      async execute(args, context) {
        return output(runtime, runtime.validateMemory(rootFromContext(context), { createMissing: args.createMissing !== false }));
      },
    }),

    aegislane_task_intake: tool({
      description: "Infer AegisLane task scope, phase, target paths, checks, risk, and execution profile from the user's prompt without requiring manual current.json edits.",
      args: {
        task: tool.schema.string().describe("The user's natural-language task prompt."),
        full: tool.schema.boolean().describe("Return the full guardrail payload. Defaults to false for lower token use.").optional(),
      },
      async execute(args, context) {
        return output(runtime, runtime.taskIntake(rootFromContext(context), args.task, { compact: args.full !== true }));
      },
    }),

    aegislane_read_current: tool({
      description: "Read and validate aegislane/state/current.json.",
      args: {
        full: tool.schema.boolean().describe("Return full current.json. Defaults to false for lower token use.").optional(),
      },
      async execute(args, context) {
        const current = runtime.readCurrent(rootFromContext(context), { createMissing: true });
        return output(runtime, args.full ? current : compactCurrent(current));
      },
    }),

    aegislane_read_phase: tool({
      description: "Read the active AegisLane phase markdown file.",
      args: {
        phase: tool.schema.string().describe("Optional phase id, such as 01-setup. Defaults to activePhase.").optional(),
        full: tool.schema.boolean().describe("Return full phase content. Defaults to false for lower token use.").optional(),
      },
      async execute(args, context) {
        const phase = runtime.readPhase(rootFromContext(context), args.phase);
        return output(runtime, args.full ? phase : compactPhase(phase));
      },
    }),

    aegislane_read_subagents: tool({
      description: "Read and validate aegislane/subagents.json.",
      args: {
        full: tool.schema.boolean().describe("Return full subagent registry. Defaults to false for lower token use.").optional(),
      },
      async execute(args, context) {
        const registry = runtime.readSubagents(rootFromContext(context), { createMissing: true });
        return output(runtime, args.full ? registry : compactSubagents(registry));
      },
    }),

    aegislane_read_lanes: tool({
      description: "Read AegisLane parallel lane ledger from aegislane/state/lanes.json.",
      args: {},
      async execute(_args, context) {
        return output(runtime, runtime.readLanes(rootFromContext(context), { createMissing: true }));
      },
    }),

    aegislane_read_skill_discovery: tool({
      description: "Read and validate aegislane/policies/skill-discovery.json.",
      args: {
        full: tool.schema.boolean().describe("Return full skill discovery policy. Defaults to false for lower token use.").optional(),
      },
      async execute(args, context) {
        const policy = runtime.readSkillDiscoveryPolicy(rootFromContext(context), { createMissing: true });
        return output(runtime, args.full ? policy : compactSkillDiscovery(policy));
      },
    }),

    aegislane_read_models: tool({
      description: "Read and validate aegislane/models.json, the source of truth for AegisLane primary and subagent model settings.",
      args: {
        full: tool.schema.boolean().describe("Return full model config. Defaults to false for lower token use.").optional(),
      },
      async execute(args, context) {
        const models = runtime.readModels(rootFromContext(context), { createMissing: true });
        return output(runtime, args.full ? models : compactModels(models));
      },
    }),

    aegislane_register_lane: tool({
      description: "Reserve an implementer lane and target paths in aegislane/state/lanes.json; rejects protected, outside-allowed, or overlapping active targets.",
      args: {
        waveId: tool.schema.string().describe("Wave id, such as implement-1.").optional(),
        laneId: tool.schema.string().describe("Lane id, such as lane-a."),
        targetPaths: tool.schema.string().describe("Comma-separated target paths owned by this implementer lane."),
        task: tool.schema.string().describe("Task slice assigned to this lane.").optional(),
        subagent: tool.schema.string().describe("Subagent name. Defaults to aegislane-implementer.").optional(),
      },
      async execute(args, context) {
        return output(
          runtime,
          runtime.registerLane(rootFromContext(context), {
            waveId: args.waveId,
            laneId: args.laneId,
            targetPaths: args.targetPaths,
            task: args.task,
            subagent: args.subagent,
            sessionID: context?.sessionID || context?.session?.id,
            agent: context?.agent || "aegislane",
          }),
        );
      },
    }),

    aegislane_release_lane: tool({
      description: "Release an active implementer lane from aegislane/state/lanes.json after review/test/diff gates finish.",
      args: {
        waveId: tool.schema.string().describe("Optional wave id.").optional(),
        laneId: tool.schema.string().describe("Lane id to release.").optional(),
        all: tool.schema.boolean().describe("Release all active lanes.").optional(),
        status: tool.schema.string().describe("Final lane status, such as released, completed, failed, or cancelled.").optional(),
      },
      async execute(args, context) {
        return output(runtime, runtime.releaseLane(rootFromContext(context), args));
      },
    }),

    aegislane_delegation_prompt: tool({
      description: "Build a complete AegisLane delegation packet prompt for invoking Kilo subagents instead of doing the work in the primary agent.",
      args: {
        task: tool.schema.string().describe("User task to delegate."),
        selectedAgents: tool.schema.string().describe("Comma-separated AegisLane subagent ids or Kilo agent names selected for this task.").optional(),
        knownContext: tool.schema.string().describe("Relevant findings already gathered from memory or prior subagents.").optional(),
        skillsMcpContext: tool.schema.string().describe("Skills loaded and MCP/docs tools selected for this task.").optional(),
        requestedOutput: tool.schema.string().describe("Exact output expected from the subagent.").optional(),
        waveId: tool.schema.string().describe("Optional AegisLane wave id, such as read-1 or implement-1.").optional(),
        laneId: tool.schema.string().describe("Optional lane id for parallel work, such as lane-a.").optional(),
        targetPaths: tool.schema.string().describe("Comma-separated paths owned by this lane. Required for implementer lanes.").optional(),
        parallelGroup: tool.schema.string().describe("Optional label for a set of parallel-safe task invocations.").optional(),
      },
      async execute(args, context) {
        const root = rootFromContext(context);
        const current = runtime.readCurrent(root, { createMissing: true });
        const intake = runtime.taskIntake(root, args.task);
        const compactIntake = runtime.taskIntake(root, args.task, { compact: true });
        const phase = runtime.readPhase(root, intake.phase.activePhase);
        const registry = runtime.readSubagents(root, { createMissing: true });
        const selected = new Set(String(args.selectedAgents || "").split(",").map((item) => item.trim()).filter(Boolean));
        const targetPaths = String(args.targetPaths || (intake.inferred.targetPaths || []).join(",")).split(",").map((item) => item.trim()).filter(Boolean);
        const targetPathStatus = targetPaths.map((targetPath) => runtime.classifyPath(root, targetPath));
        const targetPathWarnings = targetPathStatus
          .filter((item) => !item.allowed || item.protected)
          .map((item) => `${item.path}: ${item.protected ? "protected" : "outside allowedPaths"}`);
        const agents = registry.subagents
          .filter((agent) => agent.enabled !== false)
          .filter((agent) => selected.size === 0 || selected.has(agent.id) || selected.has(agent.kiloAgent) || selected.has(agent.opencodeAgent))
          .map((agent) => {
            const modelSettings = runtime.modelSettingsForAgent(root, agent.kiloAgent || agent.opencodeAgent, agent);
            return {
              id: agent.id,
              kiloAgent: agent.kiloAgent || agent.opencodeAgent,
              opencodeAgent: agent.opencodeAgent,
              mode: agent.mode,
              model: modelSettings.model,
              reasoningEffort: modelSettings.reasoningEffort,
              textVerbosity: modelSettings.textVerbosity,
              reasoningSummary: modelSettings.reasoningSummary,
              steps: modelSettings.steps,
              parallelSafe: agent.parallelSafe,
              targetPathsRequired: agent.targetPathsRequired,
              afterEachGate: agent.afterEachGate,
            };
          });
        const implementerSelected = agents.some((agent) => agent.id === "implementer" || agent.kiloAgent === "aegislane-implementer");
        let laneReservation = null;
        if (implementerSelected) {
          laneReservation = runtime.registerLane(root, {
            waveId: args.waveId,
            laneId: args.laneId,
            targetPaths,
            task: args.task,
            subagent: "aegislane-implementer",
            sessionID: context?.sessionID || context?.session?.id,
            agent: context?.agent || "aegislane",
          });
          if (!laneReservation.ok) throw new Error(`AegisLane lane rejected: ${laneReservation.issues.join("; ")}`);
        }
        return output(runtime, {
          ok: true,
          instruction: "Invoke selected kiloAgent names with this compact packet. Read policyRefs only if needed.",
          task: args.task,
          taskIntake: compactIntake,
          waveId: args.waveId || "",
          laneId: args.laneId || "",
          parallelGroup: args.parallelGroup || "",
          activePhase: phase.activePhase,
          phasePath: phase.path,
          phaseSummary: phase.content.split("\n").filter((line) => /^#|^- /.test(line)).slice(0, 12).join("\n"),
          policyRefs: compactIntake.policyRefs,
          current: {
            requiredChecks: intake.inferred.requiredChecks,
            maxFilesChanged: current.maxFilesChanged,
            maxLinesChanged: current.maxLinesChanged,
            parallelWork: current.parallelWork || { enabled: false },
            allowAutoCommit: current.allowAutoCommit,
            allowAutoPush: current.allowAutoPush,
            allowAutoDeploy: current.allowAutoDeploy,
          },
          targetPaths,
          targetPathStatus,
          targetPathWarnings,
          laneReservation,
          gatePlan: {
            afterImplementerWave: [
              "invoke aegislane-reviewer for each lane diff, parallel when supported",
              "invoke aegislane-tester when requiredChecks exist, when configured, or when checks fail",
              "run prompt-inferred requiredChecks and current.json default requiredChecks once after the wave when gateAfterParallelWave is true",
              "run aegislane_diff_policy once after the wave when gateAfterParallelWave is true",
              "primary verifies all changed files in the combined wave are allowed and not protected",
            ],
            stopOnFailure: true,
          },
          selectedSubagents: agents,
          knownContext: args.knownContext || "",
          skillsMcpContext: args.skillsMcpContext || "",
          requestedOutput:
            args.requestedOutput ||
            "Return concise findings, wave/lane id, target paths, changed files if any, checks run or recommended, risks, and the next safe step.",
        });
      },
    }),

    aegislane_diff_policy: tool({
      description: "Run AegisLane diff policy against the current git diff and optional injected changed file.",
      args: {
        changedFile: tool.schema.string().describe("Optional file path to test as changed, useful for policy checks.").optional(),
      },
      async execute(args, context) {
        return output(runtime, runtime.diffPolicy(rootFromContext(context), { changedFile: args.changedFile }));
      },
    }),

    aegislane_pr_status: tool({
      description: "Check whether the current AegisLane diff is ready for an explicit /aegislane-pr draft pull request checkpoint.",
      args: {
        force: tool.schema.boolean().describe("Treat PR checkpoint as explicitly requested.").optional(),
      },
      async execute(args, context) {
        return output(runtime, runtime.pullRequestStatus(rootFromContext(context), { force: args.force }));
      },
    }),

    aegislane_write_report: tool({
      description: "Write an AegisLane markdown report under aegislane/reports/.",
      args: {
        task: tool.schema.string().describe("Task summary.").optional(),
        summary: tool.schema.string().describe("Run summary.").optional(),
        nextStep: tool.schema.string().describe("Recommended next safe step.").optional(),
        risk: tool.schema.string().describe("Single risk item to include.").optional(),
        payloadJson: tool.schema.string().describe("Optional JSON payload with extra report fields.").optional(),
      },
      async execute(args, context) {
        return output(runtime, runtime.writeReport(rootFromContext(context), payloadFromArgs(runtime, args)));
      },
    }),

    aegislane_write_shift_note: tool({
      description: "Write an AegisLane shift note under aegislane/shift-notes/.",
      args: {
        task: tool.schema.string().describe("Task summary.").optional(),
        summary: tool.schema.string().describe("Current state summary.").optional(),
        nextStep: tool.schema.string().describe("Handoff or next safe step.").optional(),
        risk: tool.schema.string().describe("Single watchout to include.").optional(),
        payloadJson: tool.schema.string().describe("Optional JSON payload with extra shift note fields.").optional(),
      },
      async execute(args, context) {
        return output(runtime, runtime.writeShiftNote(rootFromContext(context), payloadFromArgs(runtime, args)));
      },
    }),

    aegislane_append_log: tool({
      description: "Append one redacted JSON object to aegislane/logs/automation-runs.jsonl.",
      args: {
        event: tool.schema.string().describe("Event name.").optional(),
        status: tool.schema.string().describe("Event status.").optional(),
        task: tool.schema.string().describe("Optional task name.").optional(),
        summary: tool.schema.string().describe("Optional summary.").optional(),
        payloadJson: tool.schema.string().describe("Optional JSON payload with extra log fields.").optional(),
      },
      async execute(args, context) {
        return output(runtime, runtime.appendLog(rootFromContext(context), payloadFromArgs(runtime, args)));
      },
    }),
  };
}

const server = async (context) => {
  const runtime = await loadRuntime();
  const { tool } = await loadToolHelper();
  const root = rootFromContext(context);
  const aegislaneSessions = new Set();

  function log(event, payload = {}) {
    try {
      runtime.appendLog(root, {
        event,
        status: payload.status || "info",
        source: "kilo-plugin",
        ...payload,
      });
    } catch {
      // Guard logging must never break Kilo Code.
    }
  }

  return {
    config(config) {
      try {
        const result = runtime.applyModelConfig(config, root);
        log("model.config", { status: "applied", agentCount: result.agentCount });
      } catch (error) {
        log("model.config", {
          status: "failed",
          message: runtime.redactText(error instanceof Error ? error.message : String(error)),
        });
      }
    },

    tool: tools(runtime, tool),

    async "tool.execute.before"(input, hookOutput) {
      const name = toolNameFrom(input, hookOutput);
      const args = argsFrom(input, hookOutput);
      const sessionID = sessionIDFrom(input) || sessionIDFrom(hookOutput);
      const agentName = agentNameFrom(input, hookOutput);
      if (sessionID && shouldMarkAegisLane(runtime, { input, hookOutput })) aegislaneSessions.add(sessionID);
      const paths = extractPathArgs(runtime, name, args);

      try {
        assertPrimaryEditAllowed(runtime, root, agentName, name, paths);
        if (/bash/i.test(name)) inspectBash(String(args.command || args.cmd || ""));
        inspectPaths(runtime, root, name, paths);
        if (isTaskTool(name) && /aegislane-/i.test(JSON.stringify(runtime.sanitize(args)))) {
          log("subagent.delegation", { tool: name, sessionID, agentName, status: "requested" });
        }
        log("tool.execute.before", { tool: name, sessionID, agentName, status: "allowed" });
      } catch (error) {
        log("tool.execute.before", {
          tool: name,
          sessionID,
          agentName,
          status: "blocked",
          message: runtime.redactText(error instanceof Error ? error.message : String(error)),
        });
        throw error;
      }
    },

    async "tool.execute.after"(input, hookOutput) {
      const name = toolNameFrom(input, hookOutput);
      const sessionID = sessionIDFrom(input) || sessionIDFrom(hookOutput);
      log("tool.execute.after", { tool: name, sessionID, status: "completed" });
    },

    async event(envelope) {
      const event = envelope?.event || envelope;
      const sessionID = sessionIDFrom(event);
      const markedAegisLane = shouldMarkAegisLane(runtime, event);
      if (sessionID && markedAegisLane) aegislaneSessions.add(sessionID);
      const type = String(event?.type || event?.name || event?.event || "");
      const terminalSessionEvent = /session\.(idle|error|deleted|done|stopped)$/i.test(type);
      const lock = terminalSessionEvent ? runtime.readLock(root) : null;
      const lockSessionMatches = Boolean(sessionID && lock?.sessionID === sessionID);
      const trackedSession = Boolean(sessionID && aegislaneSessions.has(sessionID));
      if (runtime.shouldLogHostEvent(type, { sessionID, markedAegisLane, trackedSession, lockSessionMatches })) {
        log("kilo.event", { type, sessionID });
      }

      if (!terminalSessionEvent) return;
      if (sessionID && (trackedSession || lockSessionMatches)) {
        const lanes = runtime.releaseLane(root, { all: true, status: "cancelled" });
        if (lanes.released) log("lane.cleanup", { sessionID, status: "released", releasedLanes: lanes.releasedLanes });
        const released = runtime.releaseLock(root);
        log("lock.cleanup", { sessionID, status: released.released ? "released" : "not-present" });
      }
    },
  };
};

export default {
  id: "aegislane",
  server,
};
