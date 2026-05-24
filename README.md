# AegisLane

<p align="center">
  <img src="assets/aegislane-hero.png" alt="AegisLane guarded autonomous development lanes" width="100%">
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green.svg"></a>
  <img alt="OpenCode mode" src="https://img.shields.io/badge/OpenCode-mode-00a6ff.svg">
  <img alt="Kilo Code mode" src="https://img.shields.io/badge/Kilo%20Code-mode-ffb000.svg">
  <img alt="Guarded autonomous loop" src="https://img.shields.io/badge/agentic%20loop-guarded-29d37d.svg">
</p>

**AegisLane is a guarded autonomous development mode for OpenCode and Kilo Code.**

It gives your coding agent lanes, locks, subagents, policy checks, reports, and a
clean handoff contract. You type a normal task. AegisLane infers the safe scope,
delegates the work, checks the diff, and stops after one verified step.

This is not just a prompt pack. The repository ships project-local agents,
commands, plugins, tools, skills, memory files, policies, installers, and tests.

## The Pitch

Most coding agents are excellent sprinters and unreliable drivers. AegisLane turns
the session into a controlled delivery lane:

```text
prompt -> intake -> lock -> explore -> delegate -> implement -> review -> test -> report -> unlock
```

The primary agent orchestrates. Read-only subagents explore, design, review, test,
and research docs. A guarded implementer performs exactly one scoped change. The
lane ledger prevents parallel work from colliding on the same target paths.

### Why It Feels Different

- Select `aegislane` as a mode, then just talk. No mandatory slash command.
- It asks a sharp grill question only when the prompt is too risky or vague.
- It reads `subagents.json` and `models.json` every run instead of baking the crew into one giant prompt.
- It blocks protected paths, secret-looking files, oversized diffs, unsafe bash, and lane conflicts where the host API allows enforcement.
- It writes reports, shift notes, and JSONL logs so long autonomous runs leave a trail.
- It supports a guarded `/aegislane-pr` checkpoint for publishing when the diff is actually ready.

### Quick Start

```bash
npm ci
npm run install:all
npm run check
npm run validate
npm test
```

Then restart OpenCode or Kilo Code and select:

```text
aegislane
```

Now give it one task:

```text
Update README.md to explain the new install flow and run npm test.
```

Optional commands:

```text
/aegislane implement the next safe step
/aegislane-grill clarify this feature idea
/aegislane-pr publish this verified checkpoint
```

### Install From GitHub

Use this for a first install from the public repository:

```bash
mkdir -p ~/repos
git clone https://github.com/semih-karakaya/aegislane.git ~/repos/aegislane
cd ~/repos/aegislane
npm ci
npm run install:all
```

Restart OpenCode or VS Code/Kilo Code after install. Select the mode/agent named
`aegislane`, then give it a normal prompt.

### Update Existing Install

After the first install, AegisLane stores version metadata and a self-contained
updater in the host config directory.

Check what is installed and what GitHub currently exposes:

```bash
node ~/.config/opencode/aegislane/update.mjs status
```

Update both OpenCode and Kilo Code from GitHub:

```bash
node ~/.config/opencode/aegislane/update.mjs all
```

You can also update from a repo checkout:

```bash
cd ~/repos/aegislane
git pull
npm ci
npm run update:status
npm run update:all
```

Pin a branch or tag when needed:

```bash
npm run update:all -- --ref main
npm run update:all -- --ref v0.2.2
```

Installed metadata is written to:

```text
~/.config/opencode/aegislane/install.json
~/.config/kilo/aegislane/install.json
```

### Where To Edit

Make source changes in:

```text
~/repos/aegislane
```

Then install them into the local OpenCode and Kilo Code config copies:

```bash
cd ~/repos/aegislane
npm run check
npm run validate
npm test
npm run install:all
```

The files under `~/.config/opencode` and `~/.config/kilo` are installed runtime
copies. Edit the source repo first, then reinstall or push and use the updater.

### Reset Install

Use this only when you want to remove the installed AegisLane files and reinstall
them. It does not delete unrelated OpenCode or Kilo Code config.

```bash
npm run uninstall:all
npm run install:all
```

## For Humans

### What You Get

- A selectable `aegislane` primary agent/mode for OpenCode and Kilo Code.
- Read-only subagents for exploration, architecture, review, testing, docs, and publishing.
- A guarded implementer subagent that should only receive one scoped implementation step.
- Durable project memory in `aegislane/`.
- Lock handling through `aegislane/state/run.lock`.
- Prompt-first task intake with phase, target path, check, and risk inference.
- Default guardrails through `aegislane/state/current.json` and `aegislane/phases/`.
- Protected path and diff policy checks.
- A lane ledger for parallel implementation lanes with target path conflict control.
- Reports, shift notes, and JSONL run logs.
- Skill discovery policy, grill-style questioning, and model selection from JSON.

### Repository Layout

```text
.opencode/          OpenCode agents, commands, plugin, tools, and skills
.kilo/              Kilo Code agents, commands, plugin, rules, and skills
assets/             README and project presentation assets
scripts/            Global installers for OpenCode and Kilo Code
aegislane/          Runtime, CLI, memory, policies, models, and tests
opencode.json       Project-local OpenCode config
kilo.jsonc          Project-local Kilo Code config
package.json        Verification and installer scripts
```

Runtime outputs are intentionally ignored by git:

```text
aegislane/state/run.lock
aegislane/state/lanes.lock
aegislane/logs/tmp/
aegislane/logs/automation-runs.jsonl
aegislane/reports/*.md
aegislane/shift-notes/*.md
```

### Install

Install the project dependencies used for validation:

```bash
npm ci
```

Install AegisLane globally for OpenCode:

```bash
npm run install:opencode
```

Install AegisLane globally for Kilo Code:

```bash
npm run install:kilo
```

Install both hosts at once:

```bash
npm run install:all
```

Remove the global AegisLane files without touching unrelated host config:

```bash
npm run uninstall:all
```

Check and apply updates from GitHub:

```bash
npm run update:status
npm run update:all
```

Restart the relevant app after installation, then select the agent/mode named:

```text
aegislane
```

### Use

Once `aegislane` is selected, type a normal task. You do not need to prefix every
task with `/aegislane`.

AegisLane should read your prompt first and infer:

- the task brief
- likely target paths
- default or prompt-implied phase
- required checks
- risk boundaries
- whether one clarification question is needed

Examples:

```text
Update README.md to explain prompt-first AegisLane and run npm test.
Fix the settings page loading state in src/settings and add the smallest relevant test.
Review the current diff and tell me the next safe step.
```

Useful commands are still available:

```text
/aegislane implement the next safe step
/aegislane-grill clarify this feature idea
/aegislane-pr publish this verified checkpoint
```

### Configure Defaults

You do not need to edit `aegislane/state/current.json` before ordinary work.
AegisLane should infer the task brief, likely phase, target paths, checks, and risks
from your prompt.

Use `current.json` only when you want to change the default guardrails:

```text
aegislane/state/current.json
```

The most important fields are:

- `activePhase`: default phase when the prompt does not imply one.
- `allowedPaths`: default files the agent may edit.
- `protectedPaths`: files the agent must not edit.
- `requiredChecks`: default checks to combine with prompt-inferred checks.
- `maxFilesChanged` and `maxLinesChanged`: diff size limits.
- `parallelWork`: controls implementer lanes and after-each-lane gates.
- `pullRequest`: controls guarded PR checkpoint behavior.

Phase files still live in:

```text
aegislane/phases/
```

AegisLane should use the prompt first, then fall back to `activePhase` when the prompt
does not imply a phase.

### Configure Subagents

Subagents are configured from:

```text
aegislane/subagents.json
```

Use this file to enable, disable, rename, or retune subagents. AegisLane should read
it at the start of every run. Disabled subagents should not be used.

Each subagent entry can define:

- `id`
- `displayName`
- `opencodeAgent`
- `kiloAgent`
- `enabled`
- `mode`
- `when`
- `responsibilities`
- `parallelSafe`
- `model`
- `reasoningEffort`
- `textVerbosity`
- `steps`

### Configure Models

Model defaults live in:

```text
aegislane/models.json
```

Example:

```json
{
  "agents": {
    "aegislane-explorer": {
      "model": "openai/gpt-5.5",
      "reasoningEffort": "medium",
      "textVerbosity": "low",
      "steps": 14
    }
  }
}
```

OpenCode and Kilo Code plugins read this file at startup and apply model settings to
the matching agents.

If you use the optional CrofAI-compatible providers, put the local API key in:

```text
aegislane/logs/tmp/crofai-api-key
```

That file is ignored by git. Do not commit provider keys, `.env` files, tokens, or
credentials.

### Verify

Run the core checks before committing or publishing changes:

```bash
npm run check
npm run validate
npm test
```

Optional OpenCode startup check:

```bash
opencode debug startup
```

Inspect prompt intake directly:

```bash
node aegislane/cli.mjs task-intake --task "Update README.md and run npm test"
```

### Recommended Human Workflow

1. Select `aegislane` in OpenCode or Kilo Code.
2. Give one clear task in normal language.
3. Let AegisLane infer scope, target paths, checks, and risks from the prompt.
4. Answer a grill question only when AegisLane cannot safely infer the next step.
5. Let AegisLane stop after one safe step.
6. Review the diff, report, shift note, and checks.
7. Adjust `aegislane/subagents.json`, `aegislane/models.json`, or `current.json` only when you want different defaults.
8. Use `/aegislane-pr` only when a verified checkpoint is ready to publish.

## For AI Agents

This section is operational guidance for AI agents working in this repository.

### Prime Directive

You are not a free-form coding agent when operating AegisLane. You are a guarded
implementation orchestrator. Optimize for:

1. Safety
2. Scope control
3. Small implementation steps
4. Passing checks
5. Clear handoff

### Required Startup Reads

At the start of every AegisLane run, first infer task scope from the user's prompt.
Then read these files from the current worktree:

```text
user prompt through aegislane_task_intake
aegislane/state/current.json
aegislane/phases/<prompt-inferred-or-default-phase>.md
aegislane/policies/protected-paths.json
aegislane/policies/diff-policy.json
aegislane/policies/skill-discovery.json
aegislane/subagents.json
aegislane/models.json
aegislane/state/lanes.json
```

If memory files are missing, create safe defaults before blocking. Treat current.json
as guardrail defaults, not as a required human-authored task form.

### Run Protocol

Follow this sequence for implementation work:

1. Acquire `aegislane/state/run.lock`.
2. Run preflight or validate the memory layout.
3. Run prompt intake on the user task.
4. Identify prompt-inferred phase, target paths, checks, risks, allowed paths, protected paths, and diff limits.
5. Ask one clarification question only when prompt intake or read-only exploration leaves unsafe ambiguity.
6. Read `aegislane/subagents.json`.
7. Select only enabled subagents whose `when` conditions match.
8. Use read-only subagents before implementation when exploration, design, docs, or risk review is needed.
9. Reserve lanes in `aegislane/state/lanes.json` before parallel implementer work.
10. Delegate exactly one small implementation step to an implementer.
11. After every implementer lane, run reviewer, tester when relevant, prompt-inferred/default checks, and diff policy.
12. Write a report and shift note.
13. Append one JSONL log entry.
14. Release the lock even on failure.

### Subagent Rules

Use `aegislane/subagents.json` as the source of truth. Do not hardcode a separate
subagent registry in your prompt.

Expected AegisLane agents:

```text
aegislane                 primary orchestrator
aegislane-explorer        read-only codebase explorer
aegislane-architect       read-only architecture reviewer
aegislane-implementer     guarded writer for one delegated step
aegislane-reviewer        read-only diff reviewer
aegislane-tester          read-only check advisor
aegislane-docs            read-only docs scout
aegislane-publisher       guarded publishing checkpoint agent
```

The primary agent should orchestrate. It should not silently do all implementation
work itself when a configured implementer subagent is available.

### Parallel Work Rules

Parallel implementer lanes are allowed only when:

- `parallelWork.enabled` is true in `current.json`.
- Each lane has explicit `targetPaths`.
- Target paths are disjoint.
- The lane ledger accepts the reservation.
- Reviewer, tester/check, and diff policy gates run after each implementer.

If lanes conflict, serialize the work or stop with a clear handoff.

### Hard Stops

Stop instead of proceeding when:

- The prompt clearly asks for work outside allowed guardrails.
- A protected path must be edited.
- A secret value is requested.
- The user asks for automatic deploy, automatic main merge, or unsafe publishing.
- Required checks cannot be run for a code-changing task.
- Diff policy fails and cannot be safely fixed.
- The requested work needs a broad refactor without explicit scope and checks.
- Auth, payment, database, infrastructure, or App Store metadata would be touched without explicit prompt scope and acceptance checks.

### File Editing Boundaries

Only edit paths allowed by the delegation packet and current guardrails. Never edit:

```text
.env
.env.*
*.key
*.pem
*.p12
*.mobileprovision
*secret*
*credential*
*token*
*api-key*
*apikey*
GoogleService-Info.plist
google-services.json
generated outputs
build outputs
runtime lock files
```

Never print secret values into reports, shift notes, logs, final answers, or command
output summaries.

### Handoff Contract

Every implementation run should produce:

```text
aegislane/reports/<timestamp>-report.md
aegislane/shift-notes/<timestamp>-shift-note.md
aegislane/logs/automation-runs.jsonl
```

Final handoff should include:

- Summary
- Task intake result
- Skills and MCP/tools used
- Parallel waves and lanes
- Subagents used
- Changed files
- Checks run
- Pass/fail state
- Diff policy result
- Risks
- Next safe step
- Lock released: yes/no

### Verification Checklist For Agents

Before claiming completion, gather current evidence:

```bash
npm run check
npm run validate
npm test
git status --short --branch
```

Use `opencode debug startup` when changing OpenCode config, plugin, tools, commands,
agents, or skills.

Do not claim success from intent, memory, or partial evidence. Verify the current
worktree.

## Reference Sources

AegisLane was built against the public documentation for:

- OpenCode agents, commands, custom tools, plugins, permissions, config, tools, skills, and MCP servers.
- Kilo Code custom modes, workflows, skills, settings, plugins, and custom tools.
- OpenAI model and prompting guidance.
- Optional OpenAI-compatible CrofAI provider metadata.

## License

MIT
