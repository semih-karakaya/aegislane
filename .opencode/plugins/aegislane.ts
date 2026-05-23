import {
  appendLog,
  applyModelConfig,
  classifyPath,
  extractPatchPaths,
  readLock,
  redactText,
  releaseLane,
  releaseLock,
  sanitize,
} from "../../aegislane/runtime.mjs";

const AEGISLANE_COMMAND = /(^|\s)\/?aegislane(\s|$)/i;
const DENIED_BASH_PATTERNS = [
  /\bgit\s+(commit|push|merge|rebase|reset)\b/i,
  /\b(?:npm|pnpm|yarn|bun)\s+(?:publish|run\s+(?:deploy|release))\b/i,
  /\b(?:vercel|netlify|firebase)\s+deploy\b/i,
  /\b(?:rm|mv|cp|cat|less|more|sed|awk|vim|nano|code)\b[^\n]*(?:\.env|\.pem|\.key|\.p12|mobileprovision|api-key|apikey|token|GoogleService-Info\.plist|google-services\.json)/i,
];

function rootFromContext(context: any) {
  return context?.worktree || context?.directory || process.cwd();
}

function sessionIDFrom(value: any) {
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

function toolNameFrom(input: any, output: any) {
  return String(output?.tool || output?.name || input?.tool || input?.name || "");
}

function argsFrom(input: any, output: any) {
  return output?.args || input?.args || {};
}

function agentNameFrom(input: any, output: any) {
  return String(
    output?.agent ||
      input?.agent ||
      output?.context?.agent ||
      input?.context?.agent ||
      output?.properties?.agent ||
      input?.properties?.agent ||
      "",
  );
}

function extractPathArgs(toolName: string, args: Record<string, any>) {
  const paths = new Set<string>();
  if (/apply_patch/i.test(toolName)) {
    for (const patchPath of extractPatchPaths(args.patchText || args.patch || "")) paths.add(patchPath);
  }
  for (const key of ["filePath", "filepath", "path", "file", "target", "absolutePath"]) {
    if (typeof args[key] === "string") paths.add(args[key]);
  }
  if (Array.isArray(args.files)) {
    for (const item of args.files) if (typeof item === "string") paths.add(item);
  }
  return [...paths];
}

function isEditTool(toolName: string) {
  return /(^|\.)(write|edit|apply_patch)$/i.test(toolName) || /apply_patch/i.test(toolName);
}

function isReadTool(toolName: string) {
  return /(^|\.)(read)$/i.test(toolName);
}

function isTaskTool(toolName: string) {
  return /(^|\.)(task)$/i.test(toolName) || /^task$/i.test(toolName);
}

function inspectPaths(root: string, toolName: string, paths: string[]) {
  const edit = isEditTool(toolName);
  const read = isReadTool(toolName);
  if (!edit && !read) return;

  const blocked = [];
  for (const candidate of paths) {
    const classified = classifyPath(root, candidate);
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

function inspectBash(command: string) {
  if (!command) return;
  for (const pattern of DENIED_BASH_PATTERNS) {
    if (pattern.test(command)) {
      throw new Error("AegisLane blocked bash command because it matches a protected-path, commit/push/merge, or deploy guard.");
    }
  }
}

function shouldMarkAegisLane(event: any) {
  const payload = JSON.stringify(sanitize(event || {}));
  return AEGISLANE_COMMAND.test(payload) || /"agent"\s*:\s*"aegislane"/i.test(payload);
}

export const AegisLanePlugin = async (context: any) => {
  const root = rootFromContext(context);
  const aegislaneSessions = new Set<string>();

  function log(event: string, payload: Record<string, any> = {}) {
    try {
      appendLog(root, {
        event,
        status: payload.status || "info",
        source: "opencode-plugin",
        ...payload,
      });
    } catch {
      // Guard logging must never break OpenCode.
    }
  }

  return {
    config(cfg: any) {
      try {
        const result = applyModelConfig(cfg, root);
        log("model.config", { status: "applied", agentCount: result.agentCount });
      } catch (error) {
        log("model.config", {
          status: "failed",
          message: redactText(error instanceof Error ? error.message : String(error)),
        });
      }
    },

    async "tool.execute.before"(input: any, output: any) {
      const toolName = toolNameFrom(input, output);
      const args = argsFrom(input, output);
      const sessionID = sessionIDFrom(input) || sessionIDFrom(output);
      const agentName = agentNameFrom(input, output);
      if (sessionID && shouldMarkAegisLane({ input, output })) aegislaneSessions.add(sessionID);

      try {
        if (isEditTool(toolName) && /^aegislane$/i.test(agentName)) {
          throw new Error("AegisLane primary is orchestrator-only. Delegate file changes to aegislane-implementer.");
        }
        if (/bash/i.test(toolName)) inspectBash(String(args.command || args.cmd || ""));
        inspectPaths(root, toolName, extractPathArgs(toolName, args));
        if (isTaskTool(toolName) && /aegislane-/i.test(JSON.stringify(sanitize(args)))) {
          log("subagent.delegation", { tool: toolName, sessionID, agentName, status: "requested" });
        }
        log("tool.execute.before", { tool: toolName, sessionID, agentName, status: "allowed" });
      } catch (error) {
        log("tool.execute.before", {
          tool: toolName,
          sessionID,
          agentName,
          status: "blocked",
          message: redactText(error instanceof Error ? error.message : String(error)),
        });
        throw error;
      }
    },

    async "tool.execute.after"(input: any, output: any) {
      const toolName = toolNameFrom(input, output);
      const sessionID = sessionIDFrom(input) || sessionIDFrom(output);
      log("tool.execute.after", { tool: toolName, sessionID, status: "completed" });
    },

    async event(envelope: any) {
      const event = envelope?.event || envelope;
      const sessionID = sessionIDFrom(event);
      if (sessionID && shouldMarkAegisLane(event)) aegislaneSessions.add(sessionID);
      const type = String(event?.type || event?.name || event?.event || "");
      log("opencode.event", { type, sessionID });

      if (!/session\.(idle|error|deleted|done|stopped)$/i.test(type)) return;
      const lock = readLock(root);
      const lockSession = lock?.sessionID || null;
      if (sessionID && (aegislaneSessions.has(sessionID) || lockSession === sessionID)) {
        const lanes = releaseLane(root, { all: true, status: "cancelled" });
        if (lanes.released) log("lane.cleanup", { sessionID, status: "released", releasedLanes: lanes.releasedLanes });
        const released = releaseLock(root);
        log("lock.cleanup", { sessionID, status: released.released ? "released" : "not-present" });
      }
    },
  };
};
