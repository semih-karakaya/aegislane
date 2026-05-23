---
description: Open a guarded AegisLane draft pull request checkpoint
agent: aegislane
---

Run an explicit AegisLane PR checkpoint for this scope:

$ARGUMENTS

This command is the only normal way AegisLane may commit, push, or open a pull request.

Required sequence:
1. Load `aegislane-skill-finder` with Kilo Code's native `skill` tool when available.
2. Load relevant GitHub publishing skills when available, especially `github` and `yeet`.
3. Read `aegislane/state/current.json`, especially `pullRequest`.
4. Read the active phase, policies, model config, subagent registry, and lane ledger.
5. Acquire `aegislane/state/run.lock`. If the lock exists, stop.
6. Run `aegislane_preflight`, `aegislane_validate_memory`, `aegislane_diff_policy`, and `aegislane_pr_status`.
7. Refuse if `pullRequest.enabled` is false.
8. Refuse if active implementer lanes exist.
9. Refuse if diff policy fails.
10. Run every `requiredChecks` entry from `current.json`.
11. If required checks cannot run, stop unless the user explicitly accepts a documented missing-check PR.
12. Invoke `aegislane-reviewer` on the final diff.
13. Invoke `aegislane-tester` when checks exist, are missing, or fail.
14. Do not implement code.
15. Do not fix issues during this command. If fixes are needed, stop and recommend a normal AegisLane implementation step.
16. If the diff is ready and scope is clear, invoke `aegislane-publisher` with a delegation packet that includes:
    - explicit `/aegislane-pr` request
    - user scope summary from `$ARGUMENTS`
    - changed files
    - checks run and results
    - diff policy result
    - branch policy from `pullRequest`
    - PR title/body expectations
    - hard ban on merge, deploy, rebase, force-push, and ready-for-review
17. Use draft PR by default.
18. Always write an AegisLane report, shift note, and JSONL log entry.
19. Always release the lock.

Final handoff must include Summary, Skills/MCP used, Subagents used, Changed files, Checks run, Diff policy result, Branch, Commit, Draft PR URL if created, Risks, Next safe step, and Lock released yes/no.
