# AegisLane For Kilo Code

AegisLane can be used in the Kilo Code VS Code extension as a primary custom mode with guarded subagents, slash commands, skills, MCP discovery, lock handling, lane control, reports, and diff policy.

## Project Install

This repository includes project-local Kilo files:

```text
kilo.jsonc
.kilo/
  agents/
  commands/
  plugin/
  rules/
  skills/
```

Open this folder in VS Code with Kilo Code installed, restart the extension, then select the `aegislane` mode/agent from Kilo Code's mode picker. Once selected, normal prompts are treated as AegisLane tasks; `/aegislane` is optional.

## Global Install

To make AegisLane available across Kilo Code workspaces on this machine:

```bash
node scripts/install-aegislane-kilo-global.mjs
```

The installer writes to:

```text
~/.config/kilo/agent/
~/.config/kilo/commands/
~/.config/kilo/plugin/
~/.config/kilo/skills/
~/.config/kilo/aegislane/
~/.config/kilo/kilo.jsonc
```

It preserves existing provider settings, MCP settings, and package dependencies, creating timestamped backups before changing existing files.

## Mode And Commands

- Mode/agent: `aegislane`
- Implementer subagent: `aegislane-implementer`
- Read-only subagents: `aegislane-explorer`, `aegislane-architect`, `aegislane-reviewer`, `aegislane-tester`, `aegislane-docs`
- Publish-only subagent: `aegislane-publisher`
- Commands: `/aegislane`, `/aegislane-grill`, `/aegislane-pr`

## Model Selection

Kilo Code AegisLane reads model settings from:

```text
aegislane/models.json
```

That file is the source of truth for the primary agent and all subagents. Change a subagent like this:

```json
{
  "agents": {
    "aegislane-docs": {
      "model": "crofai/kimi-k2.6",
      "reasoningEffort": "medium",
      "textVerbosity": "low",
      "steps": 16
    }
  }
}
```

The `.kilo/agents/*.md` frontmatter keeps fallback values for editor visibility, but the Kilo plugin applies `aegislane/models.json` at startup through its config hook. Restart VS Code/Kilo Code after editing models.

## Enforcement

Harder enforcement is done by:

- `.kilo/agents/*.md` per-agent permissions
- `.kilo/plugin/aegislane.js` lifecycle hooks and custom tools
- `aegislane/runtime.mjs` and `aegislane/cli.mjs`
- prompt intake from the user's normal message, plus `aegislane/state/current.json`, `aegislane/policies/*.json`, and `aegislane/state/lanes.json` as guardrails

The primary `aegislane` agent is orchestration-only and has editing denied. Code changes must be delegated to `aegislane-implementer`, then reviewed by the gates.

## Known Limits

Kilo Code supports custom modes, skills, workflows, MCP servers, plugins, and custom tools. AegisLane uses those surfaces. Anything Kilo Code does not expose as a hook remains prompt- and permission-level guidance, with runtime CLI/plugin checks used as the backstop.
