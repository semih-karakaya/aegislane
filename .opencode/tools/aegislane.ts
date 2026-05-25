import { tool } from "@opencode-ai/plugin";
import {
  acquireLock,
  appendLog,
  classifyPath,
  diffPolicy,
  parseJsonPayload,
  preflight as runtimePreflight,
  pullRequestStatus,
  readCurrent,
  readLanes,
  readModels,
  readPhase,
  readSkillDiscoveryPolicy,
  readSubagents,
  modelSettingsForAgent,
  registerLane,
  releaseLane,
  releaseLock,
  sanitize,
  status as runtimeStatus,
  taskIntake,
  validateMemory,
  writeReport,
  writeShiftNote,
} from "../../aegislane/runtime.mjs";

function rootFromContext(context: any) {
  return context?.worktree || context?.directory || process.cwd();
}

function output(value: unknown) {
  return JSON.stringify(sanitize(value), null, 2);
}

function payloadFromArgs(args: Record<string, any>) {
  const payload = parseJsonPayload(args.payloadJson, {});
  for (const key of ["task", "summary", "event", "status", "nextStep", "handoff"]) {
    if (args[key] !== undefined) payload[key] = args[key];
  }
  if (args.risk) payload.risks = [args.risk];
  return payload;
}

function compactCurrent(current: any) {
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

function compactPhase(phase: any) {
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

function compactSubagents(registry: any) {
  return {
    version: registry.version,
    subagents: (registry.subagents || [])
      .filter((agent: any) => agent.enabled !== false)
      .map((agent: any) => ({
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

function compactSkillDiscovery(policy: any) {
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

function compactModels(models: any) {
  return {
    version: models.version,
    defaults: models.defaults,
    agents: Object.fromEntries(
      Object.entries(models.agents || {}).map(([name, config]: [string, any]) => [
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

export const status = tool({
  description: "Show AegisLane memory, active phase, lock, and enabled subagent status.",
  args: {},
  async execute(_args, context) {
    return output(runtimeStatus(rootFromContext(context)));
  },
});

export const acquire_lock = tool({
  description: "Acquire aegislane/state/run.lock. Fails if another AegisLane run is active.",
  args: {
    task: tool.schema.string().describe("Short task description for the lock metadata.").optional(),
    executionProfile: tool.schema.string().describe("Optional execution profile, such as fast, standard, or guarded.").optional(),
  },
  async execute(args, context) {
    return output(
      acquireLock(rootFromContext(context), {
        task: args.task,
        executionProfile: args.executionProfile,
        sessionID: context?.sessionID || context?.session?.id,
        agent: context?.agent || "aegislane",
      }),
    );
  },
});

export const release_lock = tool({
  description: "Release aegislane/state/run.lock if it exists.",
  args: {},
  async execute(_args, context) {
    return output(releaseLock(rootFromContext(context)));
  },
});

export const preflight = tool({
  description: "Validate AegisLane memory and check whether a lock is already present.",
  args: {
    repair: tool.schema.boolean().describe("Create missing default AegisLane memory files before validation.").optional(),
    allowExistingLock: tool.schema.boolean().describe("Allow preflight to pass when run.lock exists.").optional(),
  },
  async execute(args, context) {
    return output(runtimePreflight(rootFromContext(context), { repair: args.repair, allowExistingLock: args.allowExistingLock }));
  },
});

export const validate_memory = tool({
  description: "Validate AegisLane project memory and optionally create safe missing defaults.",
  args: {
    createMissing: tool.schema.boolean().describe("Create safe default files when required memory files are missing.").optional(),
  },
  async execute(args, context) {
    return output(validateMemory(rootFromContext(context), { createMissing: args.createMissing !== false }));
  },
});

export const task_intake = tool({
  description: "Infer AegisLane task scope, phase, target paths, checks, risk, and execution profile from the user's prompt without requiring manual current.json edits.",
  args: {
    task: tool.schema.string().describe("The user's natural-language task prompt."),
    full: tool.schema.boolean().describe("Return the full guardrail payload. Defaults to false for lower token use.").optional(),
  },
  async execute(args, context) {
    return output(taskIntake(rootFromContext(context), args.task, { compact: args.full !== true }));
  },
});

export const read_current = tool({
  description: "Read and validate aegislane/state/current.json.",
  args: {
    full: tool.schema.boolean().describe("Return full current.json. Defaults to false for lower token use.").optional(),
  },
  async execute(args, context) {
    const current = readCurrent(rootFromContext(context), { createMissing: true });
    return output(args.full ? current : compactCurrent(current));
  },
});

export const read_phase = tool({
  description: "Read the active AegisLane phase markdown file.",
  args: {
    phase: tool.schema.string().describe("Optional phase id, such as 01-setup. Defaults to activePhase.").optional(),
    full: tool.schema.boolean().describe("Return full phase content. Defaults to false for lower token use.").optional(),
  },
  async execute(args, context) {
    const phase = readPhase(rootFromContext(context), args.phase);
    return output(args.full ? phase : compactPhase(phase));
  },
});

export const read_subagents = tool({
  description: "Read and validate aegislane/subagents.json.",
  args: {
    full: tool.schema.boolean().describe("Return full subagent registry. Defaults to false for lower token use.").optional(),
  },
  async execute(args, context) {
    const registry = readSubagents(rootFromContext(context), { createMissing: true });
    return output(args.full ? registry : compactSubagents(registry));
  },
});

export const read_lanes = tool({
  description: "Read AegisLane parallel lane ledger from aegislane/state/lanes.json.",
  args: {},
  async execute(_args, context) {
    return output(readLanes(rootFromContext(context), { createMissing: true }));
  },
});

export const read_skill_discovery = tool({
  description: "Read and validate aegislane/policies/skill-discovery.json.",
  args: {
    full: tool.schema.boolean().describe("Return full skill discovery policy. Defaults to false for lower token use.").optional(),
  },
  async execute(args, context) {
    const policy = readSkillDiscoveryPolicy(rootFromContext(context), { createMissing: true });
    return output(args.full ? policy : compactSkillDiscovery(policy));
  },
});

export const read_models = tool({
  description: "Read and validate aegislane/models.json, the source of truth for AegisLane primary and subagent model settings.",
  args: {
    full: tool.schema.boolean().describe("Return full model config. Defaults to false for lower token use.").optional(),
  },
  async execute(args, context) {
    const models = readModels(rootFromContext(context), { createMissing: true });
    return output(args.full ? models : compactModels(models));
  },
});

export const register_lane = tool({
  description: "Reserve an implementer lane and target paths in aegislane/state/lanes.json; rejects protected, outside-allowed, or overlapping active targets.",
  args: {
    waveId: tool.schema.string().describe("Wave id, such as implement-1.").optional(),
    laneId: tool.schema.string().describe("Lane id, such as lane-a."),
    targetPaths: tool.schema.string().describe("Comma-separated target paths owned by this implementer lane."),
    task: tool.schema.string().describe("Task slice assigned to this lane.").optional(),
    subagent: tool.schema.string().describe("Subagent name. Defaults to aegislane-implementer.").optional(),
  },
  async execute(args, context) {
    const result = registerLane(rootFromContext(context), {
      waveId: args.waveId,
      laneId: args.laneId,
      targetPaths: args.targetPaths,
      task: args.task,
      subagent: args.subagent,
      sessionID: context?.sessionID || context?.session?.id,
      agent: context?.agent || "aegislane",
    });
    return output(result);
  },
});

export const release_lane = tool({
  description: "Release an active implementer lane from aegislane/state/lanes.json after review/test/diff gates finish.",
  args: {
    waveId: tool.schema.string().describe("Optional wave id.").optional(),
    laneId: tool.schema.string().describe("Lane id to release.").optional(),
    all: tool.schema.boolean().describe("Release all active lanes.").optional(),
    status: tool.schema.string().describe("Final lane status, such as released, completed, failed, or cancelled.").optional(),
  },
  async execute(args, context) {
    return output(
      releaseLane(rootFromContext(context), {
        waveId: args.waveId,
        laneId: args.laneId,
        all: args.all,
        status: args.status,
      }),
    );
  },
});

export const delegation_prompt = tool({
  description: "Build a complete AegisLane delegation packet prompt for invoking subagents instead of doing the work in the primary agent.",
  args: {
    task: tool.schema.string().describe("User task to delegate."),
    selectedAgents: tool.schema
      .string()
      .describe("Comma-separated AegisLane subagent ids or opencode agent names selected for this task.")
      .optional(),
    knownContext: tool.schema.string().describe("Relevant findings already gathered from memory or prior subagents.").optional(),
    skillsMcpContext: tool.schema
      .string()
      .describe("Skills loaded and MCP/docs tools selected for this task.")
      .optional(),
    requestedOutput: tool.schema.string().describe("Exact output expected from the subagent.").optional(),
    waveId: tool.schema.string().describe("Optional AegisLane wave id, such as read-1 or implement-1.").optional(),
    laneId: tool.schema.string().describe("Optional lane id for parallel work, such as lane-a.").optional(),
    targetPaths: tool.schema
      .string()
      .describe("Comma-separated paths owned by this lane. Required for implementer lanes.")
      .optional(),
    parallelGroup: tool.schema
      .string()
      .describe("Optional label for a set of parallel-safe task invocations.")
      .optional(),
  },
  async execute(args, context) {
    const root = rootFromContext(context);
    const current = readCurrent(root, { createMissing: true });
    const intake = taskIntake(root, args.task);
    const compactIntake = taskIntake(root, args.task, { compact: true });
    const phase = readPhase(root, intake.phase.activePhase);
    const registry = readSubagents(root, { createMissing: true });
    const selected = new Set(
      String(args.selectedAgents || "")
        .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    );
    const targetPaths = String(args.targetPaths || (intake.inferred.targetPaths || []).join(","))
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const targetPathStatus = targetPaths.map((targetPath) => classifyPath(root, targetPath));
    const targetPathWarnings = targetPathStatus
      .filter((item) => !item.allowed || item.protected)
      .map((item) => `${item.path}: ${item.protected ? "protected" : "outside allowedPaths"}`);
    const agents = registry.subagents
      .filter((agent: any) => agent.enabled !== false)
      .filter((agent: any) => selected.size === 0 || selected.has(agent.id) || selected.has(agent.opencodeAgent) || selected.has(agent.kiloAgent))
      .map((agent: any) => {
        const modelSettings = modelSettingsForAgent(root, agent.opencodeAgent, agent);
        return {
          id: agent.id,
          opencodeAgent: agent.opencodeAgent,
          kiloAgent: agent.kiloAgent || agent.opencodeAgent,
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
    const implementerSelected = agents.some((agent: any) => agent.id === "implementer" || agent.opencodeAgent === "aegislane-implementer");
    let laneReservation = null;
    if (implementerSelected) {
      laneReservation = registerLane(root, {
        waveId: args.waveId,
        laneId: args.laneId,
        targetPaths,
        task: args.task,
        subagent: "aegislane-implementer",
        sessionID: context?.sessionID || context?.session?.id,
        agent: context?.agent || "aegislane",
      });
      if (!laneReservation.ok) {
        throw new Error(`AegisLane lane rejected: ${laneReservation.issues.join("; ")}`);
      }
    }
    return output({
      ok: true,
      instruction: "Invoke selected agents with this compact packet. Read policyRefs only if needed. In Kilo Code use kiloAgent; in OpenCode use opencodeAgent.",
      task: args.task,
      taskIntake: compactIntake,
      waveId: args.waveId || "",
      laneId: args.laneId || "",
      parallelGroup: args.parallelGroup || "",
      activePhase: phase.activePhase,
      phasePath: phase.path,
      phaseSummary: phase.content.split("\n").filter((line: string) => /^#|^- /.test(line)).slice(0, 12).join("\n"),
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
      promptTemplate: [
        "You are {{kiloAgent|opencodeAgent}} working under AegisLane.",
        "Task: {{task}}",
        "Wave: {{waveId}}",
        "Lane: {{laneId}}",
        "Parallel group: {{parallelGroup}}",
        "Active phase: {{activePhase}}",
        "Policy refs: {{policyRefs}}",
        "Target paths for this lane: {{targetPaths}}",
        "Required checks: {{requiredChecks}}",
        "Diff limits: {{maxFilesChanged}} files, {{maxLinesChanged}} lines.",
        "Parallel controls: {{parallelWork}}",
        "After implementer gate plan: {{gatePlan}}",
        "Skills and MCP context: {{skillsMcpContext}}",
        "Known context: {{knownContext}}",
        "Do only your assigned responsibility. Stop if the task would exceed scope, touch protected paths, require secrets, or require deploy/commit/push.",
        "Requested output: {{requestedOutput}}",
      ].join("\n"),
    });
  },
});

export const diff_policy = tool({
  description: "Run AegisLane diff policy against the current git diff and optional injected changed file.",
  args: {
    changedFile: tool.schema.string().describe("Optional file path to test as changed, useful for policy checks.").optional(),
  },
  async execute(args, context) {
    return output(diffPolicy(rootFromContext(context), { changedFile: args.changedFile }));
  },
});

export const pr_status = tool({
  description: "Check whether the current AegisLane diff is ready for an explicit /aegislane-pr draft pull request checkpoint.",
  args: {
    force: tool.schema.boolean().describe("Treat PR checkpoint as explicitly requested.").optional(),
  },
  async execute(args, context) {
    return output(pullRequestStatus(rootFromContext(context), { force: args.force }));
  },
});

export const write_report = tool({
  description: "Write an AegisLane markdown report under aegislane/reports/.",
  args: {
    task: tool.schema.string().describe("Task summary.").optional(),
    summary: tool.schema.string().describe("Run summary.").optional(),
    nextStep: tool.schema.string().describe("Recommended next safe step.").optional(),
    risk: tool.schema.string().describe("Single risk item to include.").optional(),
    payloadJson: tool.schema.string().describe("Optional JSON payload with extra report fields.").optional(),
  },
  async execute(args, context) {
    return output(writeReport(rootFromContext(context), payloadFromArgs(args)));
  },
});

export const write_shift_note = tool({
  description: "Write an AegisLane shift note under aegislane/shift-notes/.",
  args: {
    task: tool.schema.string().describe("Task summary.").optional(),
    summary: tool.schema.string().describe("Current state summary.").optional(),
    nextStep: tool.schema.string().describe("Handoff or next safe step.").optional(),
    risk: tool.schema.string().describe("Single watchout to include.").optional(),
    payloadJson: tool.schema.string().describe("Optional JSON payload with extra shift note fields.").optional(),
  },
  async execute(args, context) {
    return output(writeShiftNote(rootFromContext(context), payloadFromArgs(args)));
  },
});

export const append_log = tool({
  description: "Append one redacted JSON object to aegislane/logs/automation-runs.jsonl.",
  args: {
    event: tool.schema.string().describe("Event name.").optional(),
    status: tool.schema.string().describe("Event status.").optional(),
    task: tool.schema.string().describe("Optional task name.").optional(),
    summary: tool.schema.string().describe("Optional summary.").optional(),
    payloadJson: tool.schema.string().describe("Optional JSON payload with extra log fields.").optional(),
  },
  async execute(args, context) {
    return output(appendLog(rootFromContext(context), payloadFromArgs(args)));
  },
});
