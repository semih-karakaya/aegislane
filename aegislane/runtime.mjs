import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const PROTECTED_PATHS = [
  ".env",
  ".env.*",
  "**/*.key",
  "**/*.pem",
  "**/*.p12",
  "**/*.mobileprovision",
  "**/*secret*",
  "**/*api-key*",
  "**/*apikey*",
  "**/*token*",
  "**/*credential*",
  "**/GoogleService-Info.plist",
  "**/google-services.json",
  "ios/Runner/GoogleService-Info.plist",
  "android/app/google-services.json",
];

export const DEFAULT_SKILL_DISCOVERY_POLICY = {
  version: 1,
  enabled: true,
  loadRequiredEveryRun: true,
  requiredSkills: ["aegislane-skill-finder", "find-skills", "karpathy-guidelines"],
  opportunisticSkills: [
    "aegislane-grill-me",
    "brainstorming",
    "writing-plans",
    "executing-plans",
    "systematic-debugging",
    "test-driven-development",
    "verification-before-completion",
    "requesting-code-review",
    "using-git-worktrees",
    "github",
    "gh-fix-ci",
    "yeet",
    "supabase",
    "frontend-design",
    "design-review",
  ],
  searchWhenMissing: true,
  searchQueries: {
    frontend: "frontend design react nextjs accessibility",
    tests: "testing jest playwright e2e",
    debugging: "debugging systematic tdd verification",
    security: "security code review",
    github: "github pull request ci review",
    database: "postgres supabase database",
    mobile: "ios swiftui expo react native flutter",
    docs: "documentation api docs",
  },
  autoInstall: {
    enabled: true,
    global: true,
    maxInstallsPerRun: 3,
    minInstalls: 1000,
    requireTrustedSource: true,
    allowedSources: [
      "openai/skills",
      "obra/superpowers",
      "multica-ai/andrej-karpathy-skills",
      "vercel-labs/agent-skills",
      "anthropics/knowledge-work-plugins",
      "microsoft",
      "github.com/openai/skills",
      "github.com/multica-ai/andrej-karpathy-skills",
      "github.com/vercel-labs/agent-skills",
    ],
  },
  recordInReports: true,
};

export const DEFAULT_MODELS = {
  version: 1,
  defaults: {
    model: "openai/gpt-5.5",
    smallModel: "openai/gpt-5.5",
    reasoningEffort: "high",
    textVerbosity: "low",
    reasoningSummary: "auto",
  },
  agents: {
    aegislane: {
      model: "openai/gpt-5.5",
      reasoningEffort: "high",
      textVerbosity: "low",
      reasoningSummary: "auto",
      steps: 48,
    },
    "aegislane-explorer": {
      model: "openai/gpt-5.5",
      reasoningEffort: "medium",
      textVerbosity: "low",
      reasoningSummary: "auto",
      steps: 14,
    },
    "aegislane-architect": {
      model: "openai/gpt-5.5",
      reasoningEffort: "high",
      textVerbosity: "low",
      reasoningSummary: "auto",
      steps: 14,
    },
    "aegislane-implementer": {
      model: "openai/gpt-5.5",
      reasoningEffort: "high",
      textVerbosity: "low",
      reasoningSummary: "auto",
      steps: 32,
    },
    "aegislane-reviewer": {
      model: "openai/gpt-5.5",
      reasoningEffort: "high",
      textVerbosity: "low",
      reasoningSummary: "auto",
      steps: 14,
    },
    "aegislane-tester": {
      model: "openai/gpt-5.5",
      reasoningEffort: "high",
      textVerbosity: "low",
      reasoningSummary: "auto",
      steps: 14,
    },
    "aegislane-docs": {
      model: "openai/gpt-5.5",
      reasoningEffort: "medium",
      textVerbosity: "low",
      reasoningSummary: "auto",
      steps: 16,
    },
    "aegislane-publisher": {
      model: "openai/gpt-5.5",
      reasoningEffort: "high",
      textVerbosity: "low",
      reasoningSummary: "auto",
      steps: 20,
    },
  },
};

export const DEFAULT_CURRENT = {
  version: 1,
  activePhase: "02-active-development",
  status: "in_progress",
  allowedPaths: [
    ".gitignore",
    "README.md",
    "LICENSE",
    "package.json",
    "opencode.json",
    "kilo.jsonc",
    ".opencode/**",
    ".kilo/**",
    "assets",
    "assets/**",
    "aegislane/**",
    "scripts/**",
    "src/**",
    "tests/**",
  ],
  protectedPaths: PROTECTED_PATHS,
  requiredChecks: [],
  maxFilesChanged: 8,
  maxLinesChanged: 500,
  maxSafeStepMinutes: 90,
  promptIntake: {
    enabled: true,
    sourceOfTruth: "user_prompt",
    currentJsonRole: "defaults_and_guardrails",
    inferPhase: true,
    inferTargetPaths: true,
    inferChecks: true,
    requireManualCurrentJsonEdit: false,
  },
  skillDiscovery: DEFAULT_SKILL_DISCOVERY_POLICY,
  questioning: {
    enabled: true,
    style: "superpowers-grill",
    command: "/aegislane-grill",
    timing: "end_of_planning_before_implementation",
    askBeforeImplementation: true,
    preferAfterReadOnlyContext: true,
    oneQuestionAtATime: true,
    maxQuestions: 7,
    requireAnswersFor: [
      "ambiguous task",
      "new feature",
      "architecture change",
      "auth payment database infra or API boundary",
      "unclear acceptance criteria",
      "unclear target paths",
      "risky or irreversible work",
    ],
    skipWhen: [
      "the task is a tiny read-only answer",
      "the user explicitly says no questions",
      "all acceptance criteria and target paths are already clear",
    ],
  },
  parallelWork: {
    enabled: true,
    maxReadOnlySubagents: 3,
    maxImplementers: 2,
    requireDisjointPaths: true,
    reviewAfterEachImplementer: true,
    testAfterEachImplementer: true,
    diffPolicyAfterEachImplementer: true,
  },
  pullRequest: {
    enabled: true,
    command: "/aegislane-pr",
    strategy: "checkpoint",
    defaultDraft: true,
    requireExplicitCommand: true,
    requireUserScopeConfirmation: true,
    requirePassingChecks: true,
    requireDiffPolicyPass: true,
    requireCleanLaneLedger: true,
    branchPrefix: "aegislane/",
    titlePrefix: "[aegislane]",
    recommendAfterReports: 3,
    maxFilesPerPr: 12,
    maxLinesPerPr: 800,
  },
  allowAutoCommit: false,
  allowAutoPush: false,
  allowAutoDeploy: false,
};

export const DEFAULT_PROTECTED_PATHS = {
  protectedPaths: PROTECTED_PATHS,
};

export const DEFAULT_DIFF_POLICY = {
  maxFilesChanged: 8,
  maxLinesChanged: 500,
  forbiddenPatterns: [
    "SUPABASE_SERVICE_ROLE_KEY",
    "PRIVATE_KEY",
    "SECRET_ACCESS_KEY",
    "REVENUECAT_SECRET",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "API_SECRET",
    "CLIENT_SECRET",
    "DATABASE_URL",
    "JWT_SECRET",
    "CROFAI_API_KEY",
    "nahcrof_",
  ],
  forbiddenFileGlobs: [
    ".env",
    ".env.*",
    "**/*.key",
    "**/*.pem",
    "**/*.p12",
    "**/*.mobileprovision",
    "**/*api-key*",
    "**/*apikey*",
    "**/*token*",
    "**/GoogleService-Info.plist",
    "**/google-services.json",
  ],
};

export const DEFAULT_LANES = {
  version: 1,
  lanes: [],
};

export const DEFAULT_PHASE = `# Phase 01: Setup

## Goal
Prepare the project for AegisLane guarded autonomous development.

## Allowed work
- Add OpenCode plugin files
- Add OpenCode agent files
- Add OpenCode command files
- Add OpenCode custom tools
- Add AegisLane memory files
- Add minimal guardrail scripts

## Not allowed
- Product feature changes
- Auth changes
- Payment changes
- Database migrations
- Deployment changes
- App Store metadata changes
- Large refactors

## Done criteria
- AegisLane mode or agent exists
- AegisLane command exists
- AegisLane plugin exists
- AegisLane tools exist
- aegislane/state/current.json exists
- aegislane/subagents.json exists
- Locking works
- Preflight works
- Diff policy works
- Report and shift note are written
- Lock is released after run
`;

export const DEFAULT_ACTIVE_DEVELOPMENT_PHASE = `# Phase 02: Active Development

## Goal
Use AegisLane for guarded day-to-day development after the setup phase is complete.

## Allowed work
- Handle one small safe implementation step per AegisLane run
- Inspect the codebase through read-only subagents
- Delegate implementation only to \`aegislane-implementer\`
- Update files inside \`allowedPaths\`
- Add or update focused tests when relevant
- Update documentation and AegisLane memory files
- Run required checks, diff policy, and protected-path checks
- Prepare PR checkpoint recommendations

## Not allowed
- Editing protected paths or secret material
- Reading or printing secret values
- Auth, payment, database, infra, deployment, or App Store metadata changes without a dedicated phase
- Broad refactors without a dedicated phase
- Generated output or build artifact churn
- Automatic commit, push, merge, or deploy
- Opening a PR except through the explicit PR checkpoint workflow

## Done criteria
- Exactly one small safe step is completed or a clear stop reason is reported
- Relevant subagents were used according to \`aegislane/subagents.json\`
- Required checks were run or a clear reason is recorded
- Diff policy passes
- Protected paths were not touched
- Report and shift note are written
- JSONL run log is appended
- Lock and any lane reservations are released
`;

export const DEFAULT_SUBAGENTS = {
  version: 1,
  defaultStrategy: "auto",
  subagents: [
    {
      id: "explorer",
      displayName: "AegisLane Explorer",
      opencodeAgent: "aegislane-explorer",
      opencodeMode: "subagent",
      kiloAgent: "aegislane-explorer",
      kiloMode: "subagent",
      model: "openai/gpt-5.5",
      reasoningEffort: "medium",
      textVerbosity: "low",
      steps: 14,
      enabled: true,
      mode: "readonly",
      when: ["before implementation", "when files are unknown", "when active phase scope is unclear"],
      responsibilities: [
        "map relevant files",
        "find existing patterns",
        "identify likely affected code",
        "do not modify files",
      ],
      parallelSafe: true,
    },
    {
      id: "architect",
      displayName: "AegisLane Architect",
      opencodeAgent: "aegislane-architect",
      opencodeMode: "subagent",
      kiloAgent: "aegislane-architect",
      kiloMode: "subagent",
      model: "openai/gpt-5.5",
      reasoningEffort: "high",
      textVerbosity: "low",
      steps: 14,
      enabled: true,
      mode: "readonly",
      when: [
        "before non-trivial implementation",
        "when architecture or database or API boundaries are involved",
      ],
      responsibilities: [
        "propose smallest safe design",
        "identify coupling",
        "avoid large refactors",
        "do not modify files",
      ],
      parallelSafe: true,
    },
    {
      id: "implementer",
      displayName: "AegisLane Implementer",
      opencodeAgent: "aegislane-implementer",
      opencodeMode: "subagent",
      kiloAgent: "aegislane-implementer",
      kiloMode: "subagent",
      model: "openai/gpt-5.5",
      reasoningEffort: "high",
      textVerbosity: "low",
      steps: 32,
      enabled: true,
      mode: "guarded-write",
      when: [
        "when one safe implementation step is required",
        "after exploration and architecture context are sufficient",
        "never before lock, phase, allowed paths, and protected paths are known",
      ],
      responsibilities: [
        "execute exactly one delegated implementation step",
        "modify only allowed paths",
        "never modify protected paths",
        "stop instead of broadening scope",
        "do not invoke other subagents",
      ],
      parallelSafe: "only with disjoint targetPaths and after-implementer gates",
      targetPathsRequired: true,
      afterEachGate: [
        "aegislane-reviewer",
        "aegislane-tester when checks exist or testAfterEachImplementer is true",
        "prompt-inferred requiredChecks plus current.json defaults",
        "aegislane_diff_policy",
        "primary verification",
      ],
    },
    {
      id: "reviewer",
      displayName: "AegisLane Reviewer",
      opencodeAgent: "aegislane-reviewer",
      opencodeMode: "subagent",
      kiloAgent: "aegislane-reviewer",
      kiloMode: "subagent",
      model: "openai/gpt-5.5",
      reasoningEffort: "high",
      textVerbosity: "low",
      steps: 14,
      enabled: true,
      mode: "readonly",
      when: ["after implementation", "after every implementer lane", "before final report"],
      responsibilities: [
        "review diff",
        "find scope creep",
        "find protected path violations",
        "find risky changes",
        "do not modify files",
      ],
      parallelSafe: true,
    },
    {
      id: "tester",
      displayName: "AegisLane Tester",
      opencodeAgent: "aegislane-tester",
      opencodeMode: "subagent",
      kiloAgent: "aegislane-tester",
      kiloMode: "subagent",
      model: "openai/gpt-5.5",
      reasoningEffort: "high",
      textVerbosity: "low",
      steps: 14,
      enabled: true,
      mode: "readonly",
      when: ["after implementation", "after every implementer lane when configured", "when requiredChecks exist"],
      responsibilities: [
        "recommend checks",
        "interpret failing tests",
        "identify whether failures were caused by current diff",
        "do not modify files",
      ],
      parallelSafe: true,
    },
    {
      id: "docs",
      displayName: "AegisLane Docs Scout",
      opencodeAgent: "aegislane-docs",
      opencodeMode: "subagent",
      kiloAgent: "aegislane-docs",
      kiloMode: "subagent",
      model: "openai/gpt-5.5",
      reasoningEffort: "medium",
      textVerbosity: "low",
      steps: 16,
      enabled: true,
      mode: "readonly",
      when: [
        "when external library behavior is uncertain",
        "when OpenCode API/plugin syntax is uncertain",
        "when dependency documentation is needed",
      ],
      responsibilities: [
        "read official docs",
        "summarize current API usage",
        "cite source URLs in report if possible",
        "do not modify files",
      ],
      parallelSafe: true,
    },
    {
      id: "publisher",
      displayName: "AegisLane Publisher",
      opencodeAgent: "aegislane-publisher",
      opencodeMode: "subagent",
      kiloAgent: "aegislane-publisher",
      kiloMode: "subagent",
      model: "openai/gpt-5.5",
      reasoningEffort: "high",
      textVerbosity: "low",
      steps: 20,
      enabled: true,
      mode: "guarded-publish",
      when: [
        "only when /aegislane-pr is explicitly requested",
        "after diff policy passes",
        "after required checks pass or the user explicitly accepts documented missing checks",
      ],
      responsibilities: [
        "confirm intended PR scope",
        "stage only confirmed files",
        "commit with a concise message",
        "push the current branch or a new aegislane branch",
        "open a draft pull request",
        "never merge, deploy, or mark ready for review without explicit user request",
      ],
      parallelSafe: false,
    },
  ],
};

const REQUIRED_FILES = [
  "aegislane/state/current.json",
  "aegislane/state/lanes.json",
  "aegislane/phases/01-setup.md",
  "aegislane/policies/protected-paths.json",
  "aegislane/policies/diff-policy.json",
  "aegislane/policies/skill-discovery.json",
  "aegislane/models.json",
  "aegislane/subagents.json",
];

const REQUIRED_DIRS = [
  "aegislane/goals",
  "aegislane/phases",
  "aegislane/state",
  "aegislane/policies",
  "aegislane/reports",
  "aegislane/shift-notes",
  "aegislane/logs",
  "aegislane/logs/tmp",
];

export function resolveRoot(root = process.cwd()) {
  return path.resolve(root || process.cwd());
}

export function relPath(root, target) {
  const rootPath = resolveRoot(root);
  const absolute = path.isAbsolute(target) ? target : path.join(rootPath, target);
  const relative = path.relative(rootPath, absolute).replaceAll(path.sep, "/");
  return relative === "" ? "." : relative;
}

function file(root, relative) {
  return path.join(resolveRoot(root), relative);
}

function ensureDir(root, relative) {
  fs.mkdirSync(file(root, relative), { recursive: true });
}

function writeJsonIfMissing(root, relative, value, created) {
  const target = file(root, relative);
  if (fs.existsSync(target)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  created.push(relative);
}

function writeTextIfMissing(root, relative, value, created) {
  const target = file(root, relative);
  if (fs.existsSync(target)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value, "utf8");
  created.push(relative);
}

export function ensureMemory(root = process.cwd()) {
  const created = [];
  for (const dir of REQUIRED_DIRS) ensureDir(root, dir);
  writeJsonIfMissing(root, "aegislane/state/current.json", DEFAULT_CURRENT, created);
  writeJsonIfMissing(root, "aegislane/state/lanes.json", DEFAULT_LANES, created);
  writeTextIfMissing(root, "aegislane/phases/01-setup.md", DEFAULT_PHASE, created);
  writeTextIfMissing(root, "aegislane/phases/02-active-development.md", DEFAULT_ACTIVE_DEVELOPMENT_PHASE, created);
  writeJsonIfMissing(root, "aegislane/policies/protected-paths.json", DEFAULT_PROTECTED_PATHS, created);
  writeJsonIfMissing(root, "aegislane/policies/diff-policy.json", DEFAULT_DIFF_POLICY, created);
  writeJsonIfMissing(root, "aegislane/policies/skill-discovery.json", DEFAULT_SKILL_DISCOVERY_POLICY, created);
  writeJsonIfMissing(root, "aegislane/models.json", DEFAULT_MODELS, created);
  writeJsonIfMissing(root, "aegislane/subagents.json", DEFAULT_SUBAGENTS, created);
  return { ok: true, created };
}

function readJson(root, relative) {
  const target = file(root, relative);
  try {
    return JSON.parse(fs.readFileSync(target, "utf8"));
  } catch (error) {
    throw new Error(`Invalid or unreadable JSON at ${relative}: ${error.message}`);
  }
}

function readText(root, relative) {
  return fs.readFileSync(file(root, relative), "utf8");
}

function assertArrayOfStrings(value, name, issues) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    issues.push(`${name} must be an array of strings`);
  }
}

export function readCurrent(root = process.cwd(), options = {}) {
  if (options.createMissing) ensureMemory(root);
  const current = readJson(root, "aegislane/state/current.json");
  const issues = [];
  if (current.version !== 1) issues.push("version must be 1");
  if (typeof current.activePhase !== "string" || current.activePhase.length === 0) {
    issues.push("activePhase must be a non-empty string");
  }
  if (typeof current.status !== "string") issues.push("status must be a string");
  assertArrayOfStrings(current.allowedPaths, "allowedPaths", issues);
  assertArrayOfStrings(current.protectedPaths, "protectedPaths", issues);
  assertArrayOfStrings(current.requiredChecks, "requiredChecks", issues);
  for (const key of ["maxFilesChanged", "maxLinesChanged", "maxSafeStepMinutes"]) {
    if (!Number.isFinite(current[key]) || current[key] < 0) issues.push(`${key} must be a non-negative number`);
  }
  for (const key of ["allowAutoCommit", "allowAutoPush", "allowAutoDeploy"]) {
    if (typeof current[key] !== "boolean") issues.push(`${key} must be a boolean`);
  }
  if (current.questioning !== undefined) {
    if (!current.questioning || typeof current.questioning !== "object" || Array.isArray(current.questioning)) {
      issues.push("questioning must be an object");
    } else {
      for (const key of ["enabled", "askBeforeImplementation", "preferAfterReadOnlyContext", "oneQuestionAtATime"]) {
        if (current.questioning[key] !== undefined && typeof current.questioning[key] !== "boolean") {
          issues.push(`questioning.${key} must be a boolean`);
        }
      }
      if (current.questioning.style !== undefined && typeof current.questioning.style !== "string") {
        issues.push("questioning.style must be a string");
      }
      if (current.questioning.command !== undefined && typeof current.questioning.command !== "string") {
        issues.push("questioning.command must be a string");
      }
      if (current.questioning.timing !== undefined && typeof current.questioning.timing !== "string") {
        issues.push("questioning.timing must be a string");
      }
      if (
        current.questioning.maxQuestions !== undefined &&
        (!Number.isInteger(current.questioning.maxQuestions) || current.questioning.maxQuestions < 1)
      ) {
        issues.push("questioning.maxQuestions must be a positive integer");
      }
      if (current.questioning.requireAnswersFor !== undefined) {
        assertArrayOfStrings(current.questioning.requireAnswersFor, "questioning.requireAnswersFor", issues);
      }
      if (current.questioning.skipWhen !== undefined) {
        assertArrayOfStrings(current.questioning.skipWhen, "questioning.skipWhen", issues);
      }
    }
  }
  if (current.parallelWork !== undefined) {
    if (!current.parallelWork || typeof current.parallelWork !== "object" || Array.isArray(current.parallelWork)) {
      issues.push("parallelWork must be an object");
    } else {
      for (const key of ["enabled", "requireDisjointPaths", "reviewAfterEachImplementer", "testAfterEachImplementer", "diffPolicyAfterEachImplementer"]) {
        if (typeof current.parallelWork[key] !== "boolean") issues.push(`parallelWork.${key} must be a boolean`);
      }
      for (const key of ["maxReadOnlySubagents", "maxImplementers"]) {
        if (!Number.isInteger(current.parallelWork[key]) || current.parallelWork[key] < 1) {
          issues.push(`parallelWork.${key} must be a positive integer`);
        }
      }
    }
  }
  if (current.pullRequest !== undefined) {
    if (!current.pullRequest || typeof current.pullRequest !== "object" || Array.isArray(current.pullRequest)) {
      issues.push("pullRequest must be an object");
    } else {
      for (const key of [
        "enabled",
        "defaultDraft",
        "requireExplicitCommand",
        "requireUserScopeConfirmation",
        "requirePassingChecks",
        "requireDiffPolicyPass",
        "requireCleanLaneLedger",
      ]) {
        if (typeof current.pullRequest[key] !== "boolean") issues.push(`pullRequest.${key} must be a boolean`);
      }
      for (const key of ["command", "strategy", "branchPrefix", "titlePrefix"]) {
        if (typeof current.pullRequest[key] !== "string") issues.push(`pullRequest.${key} must be a string`);
      }
      for (const key of ["recommendAfterReports", "maxFilesPerPr", "maxLinesPerPr"]) {
        if (!Number.isInteger(current.pullRequest[key]) || current.pullRequest[key] < 0) {
          issues.push(`pullRequest.${key} must be a non-negative integer`);
        }
      }
    }
  }
  if (issues.length) throw new Error(`Invalid aegislane/state/current.json: ${issues.join("; ")}`);
  return current;
}

export function readProtectedPathsPolicy(root = process.cwd(), options = {}) {
  if (options.createMissing) ensureMemory(root);
  const policy = readJson(root, "aegislane/policies/protected-paths.json");
  const issues = [];
  assertArrayOfStrings(policy.protectedPaths, "protectedPaths", issues);
  if (issues.length) throw new Error(`Invalid aegislane/policies/protected-paths.json: ${issues.join("; ")}`);
  return policy;
}

export function readDiffPolicy(root = process.cwd(), options = {}) {
  if (options.createMissing) ensureMemory(root);
  const policy = readJson(root, "aegislane/policies/diff-policy.json");
  const issues = [];
  if (!Number.isFinite(policy.maxFilesChanged) || policy.maxFilesChanged < 0) {
    issues.push("maxFilesChanged must be a non-negative number");
  }
  if (!Number.isFinite(policy.maxLinesChanged) || policy.maxLinesChanged < 0) {
    issues.push("maxLinesChanged must be a non-negative number");
  }
  assertArrayOfStrings(policy.forbiddenPatterns, "forbiddenPatterns", issues);
  assertArrayOfStrings(policy.forbiddenFileGlobs, "forbiddenFileGlobs", issues);
  if (issues.length) throw new Error(`Invalid aegislane/policies/diff-policy.json: ${issues.join("; ")}`);
  return policy;
}

export function readSkillDiscoveryPolicy(root = process.cwd(), options = {}) {
  if (options.createMissing) ensureMemory(root);
  const policy = readJson(root, "aegislane/policies/skill-discovery.json");
  const issues = [];
  if (policy.version !== 1) issues.push("version must be 1");
  for (const key of ["enabled", "loadRequiredEveryRun", "searchWhenMissing", "recordInReports"]) {
    if (policy[key] !== undefined && typeof policy[key] !== "boolean") issues.push(`${key} must be a boolean`);
  }
  if (policy.requiredSkills !== undefined) assertArrayOfStrings(policy.requiredSkills, "requiredSkills", issues);
  if (policy.opportunisticSkills !== undefined) assertArrayOfStrings(policy.opportunisticSkills, "opportunisticSkills", issues);
  if (policy.searchQueries !== undefined && (!policy.searchQueries || typeof policy.searchQueries !== "object" || Array.isArray(policy.searchQueries))) {
    issues.push("searchQueries must be an object");
  }
  if (policy.searchQueries && typeof policy.searchQueries === "object" && !Array.isArray(policy.searchQueries)) {
    for (const [key, value] of Object.entries(policy.searchQueries)) {
      if (typeof value !== "string") issues.push(`searchQueries.${key} must be a string`);
    }
  }
  if (policy.autoInstall !== undefined) {
    if (!policy.autoInstall || typeof policy.autoInstall !== "object" || Array.isArray(policy.autoInstall)) {
      issues.push("autoInstall must be an object");
    } else {
      for (const key of ["enabled", "global", "requireTrustedSource"]) {
        if (policy.autoInstall[key] !== undefined && typeof policy.autoInstall[key] !== "boolean") {
          issues.push(`autoInstall.${key} must be a boolean`);
        }
      }
      for (const key of ["maxInstallsPerRun", "minInstalls"]) {
        if (policy.autoInstall[key] !== undefined && (!Number.isInteger(policy.autoInstall[key]) || policy.autoInstall[key] < 0)) {
          issues.push(`autoInstall.${key} must be a non-negative integer`);
        }
      }
      if (policy.autoInstall.allowedSources !== undefined) {
        assertArrayOfStrings(policy.autoInstall.allowedSources, "autoInstall.allowedSources", issues);
      }
    }
  }
  if (issues.length) throw new Error(`Invalid aegislane/policies/skill-discovery.json: ${issues.join("; ")}`);
  return policy;
}

function validateAgentModelConfig(value, name, issues) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push(`${name} must be an object`);
    return;
  }
  if (value.model !== undefined && (typeof value.model !== "string" || value.model.length === 0)) {
    issues.push(`${name}.model must be a non-empty string`);
  }
  if (value.smallModel !== undefined && (typeof value.smallModel !== "string" || value.smallModel.length === 0)) {
    issues.push(`${name}.smallModel must be a non-empty string`);
  }
  if (value.variant !== undefined && (typeof value.variant !== "string" || value.variant.length === 0)) {
    issues.push(`${name}.variant must be a non-empty string`);
  }
  if (value.reasoningEffort !== undefined && !["none", "minimal", "low", "medium", "high", "xhigh"].includes(value.reasoningEffort)) {
    issues.push(`${name}.reasoningEffort must be one of none, minimal, low, medium, high, xhigh`);
  }
  if (value.textVerbosity !== undefined && !["low", "medium", "high"].includes(value.textVerbosity)) {
    issues.push(`${name}.textVerbosity must be one of low, medium, high`);
  }
  if (value.reasoningSummary !== undefined && (typeof value.reasoningSummary !== "string" || value.reasoningSummary.length === 0)) {
    issues.push(`${name}.reasoningSummary must be a non-empty string`);
  }
  if (value.steps !== undefined && (!Number.isInteger(value.steps) || value.steps < 1)) {
    issues.push(`${name}.steps must be a positive integer`);
  }
  for (const key of ["temperature", "top_p"]) {
    if (value[key] !== undefined && !Number.isFinite(value[key])) {
      issues.push(`${name}.${key} must be a number`);
    }
  }
}

export function readModels(root = process.cwd(), options = {}) {
  if (options.createMissing) ensureMemory(root);
  const models = readJson(root, "aegislane/models.json");
  const issues = [];
  if (models.version !== 1) issues.push("version must be 1");
  validateAgentModelConfig(models.defaults || {}, "defaults", issues);
  if (!models.agents || typeof models.agents !== "object" || Array.isArray(models.agents)) {
    issues.push("agents must be an object keyed by agent name");
  } else {
    for (const [agentName, agentConfig] of Object.entries(models.agents)) {
      if (typeof agentName !== "string" || agentName.length === 0) issues.push("agent names must be non-empty strings");
      validateAgentModelConfig(agentConfig, `agents.${agentName}`, issues);
    }
  }
  if (issues.length) throw new Error(`Invalid aegislane/models.json: ${issues.join("; ")}`);
  return models;
}

function pickModelFields(value = {}) {
  const output = {};
  for (const key of ["model", "variant", "reasoningEffort", "textVerbosity", "reasoningSummary", "steps", "temperature", "top_p"]) {
    if (value[key] !== undefined) output[key] = value[key];
  }
  return output;
}

export function modelSettingsForAgent(root = process.cwd(), agentName, fallback = {}) {
  const models = readModels(root, { createMissing: true });
  return {
    ...fallback,
    ...pickModelFields(models.defaults || {}),
    ...pickModelFields((models.agents || {})[agentName] || {}),
  };
}

export function applyModelConfig(config, root = process.cwd()) {
  const models = readModels(root, { createMissing: true });
  if (models.defaults?.model) config.model = models.defaults.model;
  if (models.defaults?.smallModel) config.small_model = models.defaults.smallModel;
  config.agent = config.agent || {};
  for (const [agentName, agentConfig] of Object.entries(models.agents || {})) {
    config.agent[agentName] = {
      ...(config.agent[agentName] || {}),
      ...pickModelFields(agentConfig),
    };
  }
  return { ok: true, agentCount: Object.keys(models.agents || {}).length };
}

export function readPhase(root = process.cwd(), activePhase) {
  const current = readCurrent(root, { createMissing: true });
  const phase = activePhase || current.activePhase;
  const relative = `aegislane/phases/${phase}.md`;
  if (!fs.existsSync(file(root, relative))) throw new Error(`Active phase file is missing: ${relative}`);
  return { activePhase: phase, path: relative, content: readText(root, relative) };
}

function listPhaseIds(root) {
  const phaseDir = file(root, "aegislane/phases");
  if (!fs.existsSync(phaseDir)) return [];
  return fs
    .readdirSync(phaseDir)
    .filter((entry) => entry.endsWith(".md"))
    .map((entry) => entry.replace(/\.md$/, ""))
    .sort();
}

function inferPhaseFromTask(root, task, current) {
  const text = String(task || "");
  const phaseIds = listPhaseIds(root);
  const explicit = text.match(/\bphase\s*[:#-]?\s*([a-z0-9._-]+)/i) || text.match(/\bactivePhase\s*[:=]\s*([a-z0-9._-]+)/i);
  if (explicit && phaseIds.includes(explicit[1])) {
    return { activePhase: explicit[1], selectedBy: "prompt_explicit_phase" };
  }
  for (const phaseId of phaseIds) {
    if (text.toLowerCase().includes(phaseId.toLowerCase())) {
      return { activePhase: phaseId, selectedBy: "prompt_mentions_phase_id" };
    }
  }
  if (/\b(setup|install|bootstrap|opencode|kilo|agent|plugin|command|tool|skill)\b/i.test(text) && phaseIds.includes("01-setup")) {
    return { activePhase: "01-setup", selectedBy: "prompt_setup_keywords" };
  }
  return {
    activePhase: current.activePhase || DEFAULT_CURRENT.activePhase,
    selectedBy: "current_default_guardrail",
  };
}

function cleanPathCandidate(value) {
  return String(value || "")
    .trim()
    .replace(/^[`"'<({[]+/, "")
    .replace(/[`"'>)}\],.;:]+$/, "");
}

function looksLikePath(value) {
  const item = cleanPathCandidate(value);
  if (!item || item.includes("://") || item.startsWith("@")) return false;
  if (/^[a-z]+$/i.test(item)) return false;
  return (
    item.includes("/") ||
    /\.(?:cjs|css|go|html|java|js|json|jsonc|jsx|kt|lock|md|mjs|py|rb|rs|sh|swift|toml|ts|tsx|txt|yaml|yml)$/i.test(item)
  );
}

function inferTargetPaths(task) {
  const text = String(task || "");
  const found = [];
  for (const match of text.matchAll(/`([^`]+)`/g)) {
    if (looksLikePath(match[1])) found.push(cleanPathCandidate(match[1]));
  }
  for (const match of text.matchAll(/(?:^|[\s("'=])([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.@-]+)+|[A-Za-z0-9_.-]+\.(?:cjs|css|go|html|java|js|json|jsonc|jsx|kt|lock|md|mjs|py|rb|rs|sh|swift|toml|ts|tsx|txt|yaml|yml))(?=$|[\s)"',.;:])/g)) {
    if (looksLikePath(match[1])) found.push(cleanPathCandidate(match[1]));
  }
  return [...new Set(found)];
}

function inferChecks(task, current) {
  const checks = new Set(Array.isArray(current.requiredChecks) ? current.requiredChecks : []);
  const text = String(task || "");
  for (const match of text.matchAll(/`((?:npm|pnpm|yarn|bun|node|opencode)\s+[^`]+)`/g)) {
    checks.add(match[1].trim());
  }
  if (/\btest(?:s|ing)?\b/i.test(text) && checks.size === 0) checks.add("npm test");
  return [...checks];
}

function riskFlagsForTask(task) {
  const text = String(task || "");
  const risks = [];
  const patterns = [
    ["auth", /\b(auth|login|session|oauth|jwt)\b/i],
    ["payment", /\b(payment|billing|stripe|revenuecat|purchase|subscription)\b/i],
    ["database", /\b(database|migration|schema|sql|postgres|supabase)\b/i],
    ["infrastructure", /\b(infra|deploy|deployment|terraform|kubernetes|docker|ci|release)\b/i],
    ["secrets", /\b(secret|token|api key|credential|private key|\.env)\b/i],
    ["broad_refactor", /\b(refactor everything|large refactor|rewrite|architecture overhaul)\b/i],
  ];
  for (const [name, pattern] of patterns) {
    if (pattern.test(text)) risks.push(name);
  }
  return risks;
}

export function taskIntake(root = process.cwd(), task = "", options = {}) {
  ensureMemory(root);
  const current = readCurrent(root, { createMissing: true });
  const phaseSelection = inferPhaseFromTask(root, task, current);
  let phase = null;
  try {
    phase = readPhase(root, phaseSelection.activePhase);
  } catch (error) {
    phase = { activePhase: phaseSelection.activePhase, path: `aegislane/phases/${phaseSelection.activePhase}.md`, content: "", error: error.message };
  }
  const inferredTargetPaths = inferTargetPaths(task);
  const targetPathStatus = inferredTargetPaths.map((targetPath) => classifyPath(root, targetPath));
  const riskFlags = riskFlagsForTask(task);
  const requiredChecks = inferChecks(task, current);
  const questions = [];
  if (!String(task || "").trim()) questions.push("User task is empty.");
  if (String(task || "").trim().split(/\s+/).length < 4) questions.push("Task is too short to infer safe scope.");
  if (inferredTargetPaths.length === 0) questions.push("Target paths are not explicit; explorer should map files before implementation.");
  if (riskFlags.some((risk) => ["auth", "payment", "database", "infrastructure", "secrets", "broad_refactor"].includes(risk))) {
    questions.push("Prompt touches a high-risk boundary; clarify explicit scope, non-goals, and acceptance checks before implementation.");
  }
  const targetPathWarnings = targetPathStatus
    .filter((item) => !item.allowed || item.protected)
    .map((item) => `${item.path}: ${item.protected ? "protected" : "outside allowedPaths"}`);
  return {
    ok: true,
    task: String(task || ""),
    sourceOfTruth: "user_prompt",
    currentJsonRole: "defaults_and_guardrails",
    manualCurrentJsonEditRequired: false,
    phase: {
      activePhase: phase.activePhase,
      path: phase.path,
      selectedBy: phaseSelection.selectedBy,
      error: phase.error || undefined,
    },
    inferred: {
      targetPaths: inferredTargetPaths,
      requiredChecks,
      riskFlags,
      needsClarification: questions.length > 0,
      questions,
    },
    guardrails: {
      allowedPaths: current.allowedPaths,
      protectedPaths: current.protectedPaths,
      maxFilesChanged: current.maxFilesChanged,
      maxLinesChanged: current.maxLinesChanged,
      maxSafeStepMinutes: current.maxSafeStepMinutes,
      parallelWork: current.parallelWork || { enabled: false },
      pullRequest: current.pullRequest || { enabled: false },
      allowAutoCommit: current.allowAutoCommit,
      allowAutoPush: current.allowAutoPush,
      allowAutoDeploy: current.allowAutoDeploy,
    },
    targetPathStatus,
    targetPathWarnings,
    recommendation:
      questions.length > 0
        ? "Use read-only context and ask one clarification question before implementer delegation."
        : "Proceed with one small safe delegated implementation step.",
    options,
  };
}

export function readSubagents(root = process.cwd(), options = {}) {
  if (options.createMissing !== false && !fs.existsSync(file(root, "aegislane/subagents.json"))) {
    ensureMemory(root);
  }
  const registry = readJson(root, "aegislane/subagents.json");
  const issues = [];
  if (registry.version !== 1) issues.push("version must be 1");
  if (!Array.isArray(registry.subagents)) issues.push("subagents must be an array");
  for (const [index, agent] of (registry.subagents || []).entries()) {
    for (const key of ["id", "displayName", "opencodeAgent", "opencodeMode", "model", "mode"]) {
      if (typeof agent[key] !== "string" || agent[key].length === 0) {
        issues.push(`subagents[${index}].${key} must be a non-empty string`);
      }
    }
    if (agent.kiloAgent !== undefined && (typeof agent.kiloAgent !== "string" || agent.kiloAgent.length === 0)) {
      issues.push(`subagents[${index}].kiloAgent must be a non-empty string when present`);
    }
    if (agent.kiloMode !== undefined && agent.kiloMode !== "subagent") {
      issues.push(`subagents[${index}].kiloMode must be "subagent" when present`);
    }
    if (agent.opencodeMode !== "subagent") {
      issues.push(`subagents[${index}].opencodeMode must be "subagent"`);
    }
    for (const key of ["reasoningEffort", "reasoning_effort"]) {
      if (agent[key] !== undefined && !["none", "low", "medium", "high", "xhigh"].includes(agent[key])) {
        issues.push(`subagents[${index}].${key} must be one of none, low, medium, high, xhigh`);
      }
    }
    if (agent.textVerbosity !== undefined && !["low", "medium", "high"].includes(agent.textVerbosity)) {
      issues.push(`subagents[${index}].textVerbosity must be one of low, medium, high`);
    }
    if (agent.steps !== undefined && (!Number.isInteger(agent.steps) || agent.steps < 1)) {
      issues.push(`subagents[${index}].steps must be a positive integer`);
    }
    if (agent.parallelSafe !== undefined && typeof agent.parallelSafe !== "boolean" && typeof agent.parallelSafe !== "string") {
      issues.push(`subagents[${index}].parallelSafe must be a boolean or string`);
    }
    if (agent.targetPathsRequired !== undefined && typeof agent.targetPathsRequired !== "boolean") {
      issues.push(`subagents[${index}].targetPathsRequired must be a boolean`);
    }
    if (agent.afterEachGate !== undefined) {
      assertArrayOfStrings(agent.afterEachGate, `subagents[${index}].afterEachGate`, issues);
    }
    if (typeof agent.enabled !== "boolean") issues.push(`subagents[${index}].enabled must be a boolean`);
    assertArrayOfStrings(agent.when, `subagents[${index}].when`, issues);
    assertArrayOfStrings(agent.responsibilities, `subagents[${index}].responsibilities`, issues);
  }
  if (issues.length) throw new Error(`Invalid aegislane/subagents.json: ${issues.join("; ")}`);
  return registry;
}

function normalizeTargetPaths(root, value) {
  const raw = Array.isArray(value) ? value : String(value || "").split(",");
  return [
    ...new Set(
      raw
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .map((item) => relPath(root, item)),
    ),
  ];
}

function isActiveLane(lane) {
  return !["released", "completed", "failed", "cancelled"].includes(String(lane.status || "reserved"));
}

function hasGlobSyntax(value) {
  return /[*?[\]{}]/.test(value);
}

function staticPrefix(value) {
  const normalized = String(value || "").replaceAll("\\", "/").replace(/^\.\//, "");
  const index = normalized.search(/[*?[\]{}]/);
  if (index === -1) return normalized.replace(/\/+$/, "");
  const beforeGlob = normalized.slice(0, index);
  const slash = beforeGlob.lastIndexOf("/");
  if (slash === -1) return "";
  return beforeGlob.slice(0, slash).replace(/\/+$/, "");
}

function pathIsAncestor(parent, child) {
  const left = String(parent || "").replace(/\/+$/, "");
  const right = String(child || "").replace(/\/+$/, "");
  return left !== "" && right.startsWith(`${left}/`);
}

export function laneTargetsOverlap(left, right) {
  const a = String(left || "").replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
  const b = String(right || "").replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
  if (!a || !b) return false;
  if (a === b || pathIsAncestor(a, b) || pathIsAncestor(b, a)) return true;

  const aHasGlob = hasGlobSyntax(a);
  const bHasGlob = hasGlobSyntax(b);
  if (!aHasGlob && !bHasGlob) return false;

  if (aHasGlob && !bHasGlob && matchGlob(b, a)) return true;
  if (bHasGlob && !aHasGlob && matchGlob(a, b)) return true;

  const aPrefix = staticPrefix(a);
  const bPrefix = staticPrefix(b);
  if (!aPrefix || !bPrefix) return true;
  return aPrefix === bPrefix || pathIsAncestor(aPrefix, bPrefix) || pathIsAncestor(bPrefix, aPrefix);
}

export function readLanes(root = process.cwd(), options = {}) {
  if (options.createMissing !== false && !fs.existsSync(file(root, "aegislane/state/lanes.json"))) {
    ensureMemory(root);
  }
  const ledger = readJson(root, "aegislane/state/lanes.json");
  const issues = [];
  if (ledger.version !== 1) issues.push("version must be 1");
  if (!Array.isArray(ledger.lanes)) issues.push("lanes must be an array");
  for (const [index, lane] of (ledger.lanes || []).entries()) {
    if (typeof lane.laneId !== "string" || lane.laneId.length === 0) {
      issues.push(`lanes[${index}].laneId must be a non-empty string`);
    }
    if (lane.waveId !== undefined && typeof lane.waveId !== "string") {
      issues.push(`lanes[${index}].waveId must be a string`);
    }
    if (lane.status !== undefined && typeof lane.status !== "string") {
      issues.push(`lanes[${index}].status must be a string`);
    }
    assertArrayOfStrings(lane.targetPaths, `lanes[${index}].targetPaths`, issues);
  }
  if (issues.length) throw new Error(`Invalid aegislane/state/lanes.json: ${issues.join("; ")}`);
  return ledger;
}

function writeLanes(root, ledger) {
  ensureDir(root, "aegislane/state");
  fs.writeFileSync(file(root, "aegislane/state/lanes.json"), `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
}

function sleepSync(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function withLaneLedgerLock(root, callback) {
  ensureDir(root, "aegislane/state");
  const lockFile = file(root, "aegislane/state/lanes.lock");
  let handle = null;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      handle = fs.openSync(lockFile, "wx");
      fs.writeFileSync(handle, `${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })}\n`, "utf8");
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      sleepSync(20);
    }
  }
  if (handle === null) {
    throw new Error("aegislane/state/lanes.lock already exists; another lane reservation is in progress");
  }
  try {
    return callback();
  } finally {
    try {
      fs.closeSync(handle);
    } finally {
      try {
        fs.unlinkSync(lockFile);
      } catch {
        // A stale lane lock should not mask the original lane operation result.
      }
    }
  }
}

export function registerLane(root = process.cwd(), options = {}) {
  ensureMemory(root);
  const current = readCurrent(root);
  const laneId = String(options.laneId || "").trim();
  const waveId = String(options.waveId || "").trim();
  const targetPaths = normalizeTargetPaths(root, options.targetPaths);
  const issues = [];

  if (!laneId) issues.push("laneId is required");
  if (!targetPaths.length) issues.push("targetPaths is required for implementer lanes");

  const targetPathStatus = targetPaths.map((targetPath) => classifyPath(root, targetPath));
  for (const status of targetPathStatus) {
    if (status.protected) issues.push(`${status.path} is protected`);
    if (!status.allowed) issues.push(`${status.path} is outside allowedPaths`);
  }

  return withLaneLedgerLock(root, () => {
    const ledger = readLanes(root, { createMissing: true });
    const active = (ledger.lanes || []).filter(isActiveLane);
    const existing = active.find((lane) => lane.laneId === laneId);
    if (existing) {
      const sameWave = !waveId || !existing.waveId || existing.waveId === waveId;
      const sameTargets = JSON.stringify(existing.targetPaths || []) === JSON.stringify(targetPaths);
      if (sameWave && sameTargets) {
        return {
          ok: true,
          registered: false,
          idempotent: true,
          laneLedgerPath: "aegislane/state/lanes.json",
          lane: sanitize(existing),
          issues: [],
        };
      }
      issues.push(`laneId ${laneId} is already active`);
    }

    const requireDisjoint = current.parallelWork?.requireDisjointPaths !== false;
    if (requireDisjoint) {
      for (const lane of active) {
        if (lane.laneId === laneId) continue;
        for (const targetPath of targetPaths) {
          for (const existingTarget of lane.targetPaths || []) {
            if (laneTargetsOverlap(targetPath, existingTarget)) {
              issues.push(`${targetPath} conflicts with ${lane.laneId}:${existingTarget}`);
            }
          }
        }
      }
    }

    if (issues.length) {
      return {
        ok: false,
        registered: false,
        laneLedgerPath: "aegislane/state/lanes.json",
        targetPathStatus,
        issues,
      };
    }

    const now = new Date().toISOString();
    const lane = {
      laneId,
      waveId,
      targetPaths,
      status: options.status || "reserved",
      subagent: options.subagent || "aegislane-implementer",
      task: options.task || "",
      sessionID: options.sessionID || null,
      agent: options.agent || null,
      createdAt: now,
      updatedAt: now,
    };
    ledger.lanes.push(lane);
    writeLanes(root, ledger);
    return {
      ok: true,
      registered: true,
      laneLedgerPath: "aegislane/state/lanes.json",
      lane: sanitize(lane),
      issues: [],
    };
  });
}

export function releaseLane(root = process.cwd(), options = {}) {
  ensureMemory(root);
  const laneId = String(options.laneId || "").trim();
  const waveId = String(options.waveId || "").trim();
  const issues = [];
  if (!laneId && !options.all) issues.push("laneId is required unless all is true");
  if (issues.length) return { ok: false, released: false, laneLedgerPath: "aegislane/state/lanes.json", issues };

  return withLaneLedgerLock(root, () => {
    const ledger = readLanes(root, { createMissing: true });
    const now = new Date().toISOString();
    const released = [];
    for (const lane of ledger.lanes || []) {
      if (!isActiveLane(lane)) continue;
      if (!options.all && lane.laneId !== laneId) continue;
      if (waveId && lane.waveId !== waveId) continue;
      lane.status = options.status || "released";
      lane.updatedAt = now;
      released.push(lane.laneId);
    }
    if (released.length) writeLanes(root, ledger);
    return {
      ok: true,
      released: released.length > 0,
      releasedLanes: released,
      laneLedgerPath: "aegislane/state/lanes.json",
      issues: released.length ? [] : ["no active matching lane found"],
    };
  });
}

export function validateMemory(root = process.cwd(), options = {}) {
  const created = options.createMissing === false ? [] : ensureMemory(root).created;
  const missing = [];
  for (const relative of REQUIRED_FILES) {
    if (!fs.existsSync(file(root, relative))) missing.push(relative);
  }
  if (missing.length) {
    return { ok: false, created, missing, issues: missing.map((item) => `Missing required file: ${item}`) };
  }

  const issues = [];
  try {
    readCurrent(root);
  } catch (error) {
    issues.push(error.message);
  }
  try {
    readProtectedPathsPolicy(root);
  } catch (error) {
    issues.push(error.message);
  }
  try {
    readDiffPolicy(root);
  } catch (error) {
    issues.push(error.message);
  }
  try {
    readSkillDiscoveryPolicy(root);
  } catch (error) {
    issues.push(error.message);
  }
  try {
    readModels(root);
  } catch (error) {
    issues.push(error.message);
  }
  try {
    readPhase(root);
  } catch (error) {
    issues.push(error.message);
  }
  try {
    readSubagents(root, { createMissing: false });
  } catch (error) {
    issues.push(error.message);
  }
  try {
    readLanes(root, { createMissing: false });
  } catch (error) {
    issues.push(error.message);
  }

  return { ok: issues.length === 0, created, missing, issues };
}

function escapeRegExp(value) {
  return value.replace(/[\\^$+?.()|[\]{}]/g, "\\$&");
}

export function globToRegExp(glob) {
  let pattern = "";
  const source = glob.replaceAll("\\", "/").replace(/^\.\//, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "*") {
      const next = source[index + 1];
      const afterNext = source[index + 2];
      if (next === "*") {
        if (afterNext === "/") {
          pattern += "(?:.*\\/)?";
          index += 2;
        } else {
          pattern += ".*";
          index += 1;
        }
      } else {
        pattern += "[^/]*";
      }
    } else if (char === "?") {
      pattern += "[^/]";
    } else if (char === "/") {
      pattern += "\\/";
    } else {
      pattern += escapeRegExp(char);
    }
  }
  return new RegExp(`^${pattern}$`);
}

export function matchGlob(relativePath, glob) {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\.\//, "");
  return globToRegExp(glob).test(normalized);
}

export function anyGlobMatch(relativePath, globs = []) {
  return globs.some((glob) => matchGlob(relativePath, glob));
}

export function getPolicyGlobs(root = process.cwd()) {
  const current = readCurrent(root, { createMissing: true });
  const protectedPolicy = readProtectedPathsPolicy(root, { createMissing: true });
  const diffPolicy = readDiffPolicy(root, { createMissing: true });
  const protectedPaths = [
    ...(current.protectedPaths || []),
    ...(protectedPolicy.protectedPaths || []),
    ...(diffPolicy.forbiddenFileGlobs || []),
  ];
  return {
    allowedPaths: current.allowedPaths || [],
    protectedPaths: [...new Set(protectedPaths)],
  };
}

export function classifyPath(root, target) {
  const relative = relPath(root, target);
  const { allowedPaths, protectedPaths } = getPolicyGlobs(root);
  return {
    path: relative,
    allowed: anyGlobMatch(relative, allowedPaths),
    protected: anyGlobMatch(relative, protectedPaths),
  };
}

export function extractPatchPaths(patchText = "") {
  const paths = [];
  for (const line of String(patchText).split(/\r?\n/)) {
    const match = line.match(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/) || line.match(/^\*\*\* Move to: (.+)$/);
    if (match) paths.push(match[1].trim());
  }
  return [...new Set(paths)];
}

function commandOutput(command, args, cwd) {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch {
    return "";
  }
}

function isGitRepo(root) {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

function parseNumstat(text) {
  const result = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [addedRaw, deletedRaw, ...pathParts] = line.split(/\s+/);
    const filePath = pathParts.join(" ");
    if (!filePath) continue;
    const added = addedRaw === "-" ? 0 : Number(addedRaw);
    const deleted = deletedRaw === "-" ? 0 : Number(deletedRaw);
    const total = (Number.isFinite(added) ? added : 0) + (Number.isFinite(deleted) ? deleted : 0);
    result.set(filePath, (result.get(filePath) || 0) + total);
  }
  return result;
}

function collectGitDiff(root) {
  if (!isGitRepo(root)) {
    return { gitAvailable: false, files: [], lineChanges: new Map(), diffText: "" };
  }
  const status = commandOutput("git", ["status", "--porcelain"], root);
  const files = [];
  for (const line of status.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const raw = line.slice(3).trim();
    const renamed = raw.includes(" -> ") ? raw.split(" -> ").at(-1) : raw;
    files.push(renamed);
  }

  const numstat = new Map([
    ...parseNumstat(commandOutput("git", ["diff", "--numstat"], root)),
    ...parseNumstat(commandOutput("git", ["diff", "--cached", "--numstat"], root)),
  ]);
  const diffText = [
    commandOutput("git", ["diff", "--no-ext-diff"], root),
    commandOutput("git", ["diff", "--cached", "--no-ext-diff"], root),
  ].join("\n");

  return { gitAvailable: true, files: [...new Set(files)], lineChanges: numstat, diffText };
}

function gitScalar(root, args) {
  const value = commandOutput("git", args, root).trim();
  return value || null;
}

function commandExists(command, args = ["--version"], root = process.cwd()) {
  try {
    execFileSync(command, args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

export function redactText(value) {
  if (typeof value !== "string") return value;
  let text = value;
  text = text.replace(
    /\b([A-Z0-9_]*(?:SECRET|TOKEN|KEY|PASSWORD|CREDENTIAL|DATABASE_URL)[A-Z0-9_]*)\b\s*[:=]\s*["']?([^"'\s,}]+)/gi,
    "$1=[REDACTED]",
  );
  text = text.replace(/(-----BEGIN [A-Z ]*PRIVATE KEY-----)[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----)/g, "$1\n[REDACTED]\n$2");
  return text;
}

export function sanitize(value) {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (value && typeof value === "object") {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      if (/secret|token|password|credential|private.?key/i.test(key)) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = sanitize(item);
      }
    }
    return result;
  }
  return value;
}

export function readLock(root = process.cwd()) {
  const lockFile = file(root, "aegislane/state/run.lock");
  if (!fs.existsSync(lockFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(lockFile, "utf8"));
  } catch {
    return { unreadable: true };
  }
}

export function acquireLock(root = process.cwd(), options = {}) {
  ensureDir(root, "aegislane/state");
  const lockFile = file(root, "aegislane/state/run.lock");
  const payload = {
    version: 1,
    owner: "aegislane",
    task: options.task || "",
    pid: process.pid,
    sessionID: options.sessionID || null,
    agent: options.agent || null,
    createdAt: new Date().toISOString(),
  };
  try {
    const handle = fs.openSync(lockFile, "wx");
    fs.writeFileSync(handle, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    fs.closeSync(handle);
    return { ok: true, acquired: true, lockPath: "aegislane/state/run.lock", lock: sanitize(payload) };
  } catch (error) {
    if (error.code === "EEXIST") {
      return { ok: false, acquired: false, lockPath: "aegislane/state/run.lock", lock: sanitize(readLock(root)) };
    }
    throw error;
  }
}

export function releaseLock(root = process.cwd()) {
  const lockFile = file(root, "aegislane/state/run.lock");
  if (!fs.existsSync(lockFile)) return { ok: true, released: false, reason: "lock was not present" };
  fs.unlinkSync(lockFile);
  return { ok: true, released: true, lockPath: "aegislane/state/run.lock" };
}

export function preflight(root = process.cwd(), options = {}) {
  const validation = validateMemory(root, { createMissing: Boolean(options.repair) });
  const lock = readLock(root);
  const issues = [...validation.issues];
  if (lock && !options.allowExistingLock) issues.push("aegislane/state/run.lock already exists");
  return {
    ok: issues.length === 0,
    memory: validation,
    lockPresent: Boolean(lock),
    issues,
  };
}

export function status(root = process.cwd()) {
  const validation = validateMemory(root, { createMissing: false });
  const current = validation.ok ? readCurrent(root) : null;
  const phase = current ? readPhase(root, current.activePhase) : null;
  const subagents = validation.ok ? readSubagents(root, { createMissing: false }) : null;
  const skillDiscovery = validation.ok ? readSkillDiscoveryPolicy(root, { createMissing: false }) : null;
  const models = validation.ok ? readModels(root, { createMissing: false }) : null;
  return sanitize({
    ok: validation.ok,
    validation,
    lock: readLock(root),
    activePhase: current?.activePhase || null,
    phasePath: phase?.path || null,
    maxSafeStepMinutes: current?.maxSafeStepMinutes ?? null,
    enabledSubagents: subagents?.subagents?.filter((agent) => agent.enabled).map((agent) => agent.opencodeAgent) || [],
    models,
    skillDiscovery,
    questioning: current?.questioning || null,
    pullRequest: current?.pullRequest || null,
    activeLanes: validation.ok ? readLanes(root, { createMissing: false }).lanes.filter(isActiveLane).map((lane) => ({
      waveId: lane.waveId,
      laneId: lane.laneId,
      targetPaths: lane.targetPaths,
      status: lane.status,
      subagent: lane.subagent,
    })) : [],
  });
}

export function pullRequestStatus(root = process.cwd(), options = {}) {
  ensureMemory(root);
  const resolved = resolveRoot(root);
  const current = readCurrent(root);
  const prPolicy = current.pullRequest || DEFAULT_CURRENT.pullRequest;
  const diff = diffPolicy(root);
  const lanes = readLanes(root, { createMissing: true });
  const activeLanes = (lanes.lanes || []).filter(isActiveLane);
  const reportCount = fs.existsSync(file(root, "aegislane/reports"))
    ? fs.readdirSync(file(root, "aegislane/reports")).filter((name) => name.endsWith("-report.md")).length
    : 0;
  const gitAvailable = isGitRepo(resolved);
  const branch = gitAvailable ? gitScalar(resolved, ["branch", "--show-current"]) : null;
  const remote = gitAvailable ? gitScalar(resolved, ["remote", "get-url", "origin"]) : null;
  const defaultBranch = gitAvailable ? gitScalar(resolved, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]) : null;
  const ghAvailable = commandExists("gh", ["--version"], resolved);
  const issues = [];

  if (!prPolicy.enabled) issues.push("pullRequest.enabled is false");
  if (prPolicy.requireCleanLaneLedger !== false && activeLanes.length) {
    issues.push(`active implementer lanes must be released first: ${activeLanes.map((lane) => lane.laneId).join(", ")}`);
  }
  if (!gitAvailable) issues.push("not inside a git repository");
  if (gitAvailable && !branch) issues.push("could not determine current git branch");
  if (gitAvailable && !remote) issues.push("git remote origin is missing");
  if (!ghAvailable) issues.push("GitHub CLI gh is not available");
  if (prPolicy.requireDiffPolicyPass !== false && !diff.ok) issues.push("diff policy must pass before PR publishing");
  if (diff.filesChangedCount > (prPolicy.maxFilesPerPr ?? Number.POSITIVE_INFINITY)) {
    issues.push(`changed file count ${diff.filesChangedCount} exceeds pullRequest.maxFilesPerPr ${prPolicy.maxFilesPerPr}`);
  }
  if (diff.totalLinesChanged > (prPolicy.maxLinesPerPr ?? Number.POSITIVE_INFINITY)) {
    issues.push(`changed line count ${diff.totalLinesChanged} exceeds pullRequest.maxLinesPerPr ${prPolicy.maxLinesPerPr}`);
  }

  const recommended =
    Boolean(prPolicy.enabled) &&
    (Boolean(options.force) ||
      diff.filesChangedCount > 0 ||
      reportCount >= (prPolicy.recommendAfterReports || Number.POSITIVE_INFINITY));

  return sanitize({
    ok: issues.length === 0,
    recommended,
    command: prPolicy.command || "/aegislane-pr",
    policy: prPolicy,
    git: {
      available: gitAvailable,
      branch,
      remotePresent: Boolean(remote),
      defaultBranch,
      ghAvailable,
    },
    diffPolicy: diff,
    reportsCount: reportCount,
    activeLanes: activeLanes.map((lane) => ({
      waveId: lane.waveId,
      laneId: lane.laneId,
      targetPaths: lane.targetPaths,
      status: lane.status,
    })),
    nextAction: issues.length
      ? `Fix PR blockers before running ${prPolicy.command || "/aegislane-pr"}`
      : `Run ${prPolicy.command || "/aegislane-pr"} with a scope summary to open a draft PR checkpoint`,
    issues,
  });
}

export function diffPolicy(root = process.cwd(), options = {}) {
  ensureMemory(root);
  const current = readCurrent(root);
  const policy = readDiffPolicy(root);
  const { allowedPaths, protectedPaths } = getPolicyGlobs(root);
  const git = collectGitDiff(resolveRoot(root));
  const injectedFiles = [];
  if (options.changedFile) injectedFiles.push(options.changedFile);
  if (Array.isArray(options.changedFiles)) injectedFiles.push(...options.changedFiles);

  const files = [...new Set([...git.files, ...injectedFiles].map((item) => relPath(root, item)))].filter(Boolean);
  const maxFilesChanged = current.maxFilesChanged ?? policy.maxFilesChanged;
  const maxLinesChanged = current.maxLinesChanged ?? policy.maxLinesChanged;
  const totalLinesChanged = [...git.lineChanges.values()].reduce((sum, count) => sum + count, 0);

  const protectedViolations = files.filter((changed) => anyGlobMatch(changed, protectedPaths));
  const outsideAllowed = files.filter((changed) => !anyGlobMatch(changed, allowedPaths));
  const forbiddenPatternsFound = (policy.forbiddenPatterns || []).filter((pattern) => git.diffText.includes(pattern));
  const issues = [];
  if (files.length > maxFilesChanged) issues.push(`Changed file count ${files.length} exceeds maxFilesChanged ${maxFilesChanged}`);
  if (totalLinesChanged > maxLinesChanged) issues.push(`Changed line count ${totalLinesChanged} exceeds maxLinesChanged ${maxLinesChanged}`);
  if (protectedViolations.length) issues.push(`Protected path changes detected: ${protectedViolations.join(", ")}`);
  if (outsideAllowed.length) issues.push(`Changes outside allowedPaths detected: ${outsideAllowed.join(", ")}`);
  if (forbiddenPatternsFound.length) issues.push(`Forbidden secret-like patterns detected: ${forbiddenPatternsFound.join(", ")}`);

  return sanitize({
    ok: issues.length === 0,
    gitAvailable: git.gitAvailable,
    filesChanged: files,
    filesChangedCount: files.length,
    totalLinesChanged,
    maxFilesChanged,
    maxLinesChanged,
    protectedViolations,
    outsideAllowed,
    forbiddenPatternsFound,
    issues,
  });
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function normalizeMarkdownLine(value) {
  return redactText(String(value || "").trim() || "Not provided");
}

export function writeReport(root = process.cwd(), payload = {}) {
  ensureDir(root, "aegislane/reports");
  const stamp = payload.timestamp || timestamp();
  const relative = `aegislane/reports/${stamp}-report.md`;
  const diff = payload.diffPolicy || diffPolicy(root);
  const changedFiles = payload.changedFiles || diff.filesChanged || [];
  const content = `# AegisLane Report ${stamp}

## Task
${normalizeMarkdownLine(payload.task)}

## Summary
${normalizeMarkdownLine(payload.summary)}

## Subagents Used
${(payload.subagentsUsed || []).map((agent) => `- ${normalizeMarkdownLine(agent)}`).join("\n") || "- None recorded"}

## Changed Files
${changedFiles.map((changed) => `- ${normalizeMarkdownLine(changed)}`).join("\n") || "- None recorded"}

## Checks
${(payload.checks || []).map((check) => `- ${normalizeMarkdownLine(check)}`).join("\n") || "- None recorded"}

## Diff Policy
${diff.ok ? "Passed" : "Failed"}

${(diff.issues || []).map((issue) => `- ${normalizeMarkdownLine(issue)}`).join("\n") || "- No issues recorded"}

## Risks
${(payload.risks || []).map((risk) => `- ${normalizeMarkdownLine(risk)}`).join("\n") || "- None recorded"}

## Next Safe Step
${normalizeMarkdownLine(payload.nextStep)}

## Lock Released
${payload.lockReleased === true ? "yes" : payload.lockReleased === false ? "no" : "unknown"}
`;
  fs.writeFileSync(file(root, relative), content, "utf8");
  return { ok: true, path: relative };
}

export function writeShiftNote(root = process.cwd(), payload = {}) {
  ensureDir(root, "aegislane/shift-notes");
  const stamp = payload.timestamp || timestamp();
  const relative = `aegislane/shift-notes/${stamp}-shift-note.md`;
  const content = `# AegisLane Shift Note ${stamp}

## Current State
${normalizeMarkdownLine(payload.summary)}

## Last Task
${normalizeMarkdownLine(payload.task)}

## Handoff
${normalizeMarkdownLine(payload.handoff || payload.nextStep)}

## Watchouts
${(payload.risks || []).map((risk) => `- ${normalizeMarkdownLine(risk)}`).join("\n") || "- None recorded"}
`;
  fs.writeFileSync(file(root, relative), content, "utf8");
  return { ok: true, path: relative };
}

export function appendLog(root = process.cwd(), payload = {}) {
  ensureDir(root, "aegislane/logs");
  const entry = sanitize({
    timestamp: new Date().toISOString(),
    event: payload.event || "aegislane.event",
    status: payload.status || "info",
    ...payload,
  });
  fs.appendFileSync(file(root, "aegislane/logs/automation-runs.jsonl"), `${JSON.stringify(entry)}\n`, "utf8");
  return { ok: true, path: "aegislane/logs/automation-runs.jsonl", entry };
}

export function parseJsonPayload(value, fallback = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid JSON payload: ${error.message}`);
  }
}

export function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  return error;
}
