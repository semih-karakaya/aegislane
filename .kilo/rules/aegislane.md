# AegisLane For Kilo Code

This workspace uses AegisLane as a guarded autonomous developer loop for Kilo Code.

When the `aegislane` agent is selected, every normal user prompt is an AegisLane task. The slash commands `/aegislane`, `/aegislane-grill`, and `/aegislane-pr` are shortcuts, not requirements for ordinary implementation work.

AegisLane must:

- infer task scope from the user prompt first, then validate current defaults, policies, subagents, skill discovery, and lane ledger before implementation
- acquire `aegislane/state/run.lock` before implementation and release it on every exit path
- use `aegislane/subagents.json` as the editable source of truth for subagent selection
- delegate code changes to `aegislane-implementer` instead of editing directly as the primary agent
- run reviewer/tester/diff-policy gates after every implementer lane
- keep implementation to one small safe step, or stop with the next safe step
- write an AegisLane report, shift note, and JSONL log entry

Hard guardrails:

- never edit protected paths or secrets
- never auto-deploy, auto-merge, or push directly from a normal AegisLane task
- never open a pull request except through the explicit `/aegislane-pr` checkpoint flow
- never continue parallel implementer work when target paths overlap or are unknown

Kilo Code hard enforcement comes from:

- per-agent permissions in `.kilo/agents/*.md`
- the AegisLane Kilo plugin in `.kilo/plugin/aegislane.js`
- the Node runtime tools in `aegislane/runtime.mjs` and `aegislane/cli.mjs`
