---
description: Run AegisLane guarded autonomous developer loop
agent: aegislane
---

Run AegisLane for this user task:

$ARGUMENTS

You must run the guarded workflow, not an open-ended coding session.

Required sequence:
1. Load `aegislane-skill-finder` with OpenCode's native `skill` tool when available.
2. Treat `$ARGUMENTS` as the source of truth for this run. Do not require the user to edit `aegislane/state/current.json` before ordinary work.
3. Use `aegislane_validate_memory` with safe defaults, then use `aegislane_task_intake` on `$ARGUMENTS` to infer phase, target paths, checks, risk, and clarification needs from the prompt.
4. Read `aegislane/models.json`, `aegislane/policies/skill-discovery.json`, and current.json only as default guardrails and policy fallback.
5. Load required skills from the skill discovery policy when available, including `find-skills` for ecosystem discovery and `karpathy-guidelines` for coding discipline.
6. If a task-critical skill is missing, run `npx skills find <specific query>`. If auto-install is enabled, install only clearly relevant trusted skills within the configured per-run limit.
7. Load directly relevant available skills before planning.
8. Use available MCP/docs tools, especially `context7`, when current official documentation is needed.
9. Use `aegislane_read_current`, `aegislane_read_phase` for the inferred phase, `aegislane_read_skill_discovery`, `aegislane_read_models`, `aegislane_read_subagents`, `aegislane_read_lanes`, and policy-aware context before changing files.
10. Use `aegislane_acquire_lock` before implementation. If the lock already exists, stop.
11. Use `aegislane_preflight`.
12. Read `parallelWork`, `questioning`, `pullRequest`, and `maxSafeStepMinutes` from task intake/current defaults and obey their limits.
13. Use `aegislane_delegation_prompt` to create a complete delegation packet for each selected subagent. Include task intake, skills/MCP context, wave id, lane id, and target paths for every implementer lane.
14. Read `aegislane/subagents.json` as the source of truth for subagent selection. Invoke only the fewest enabled subagents whose conditions materially match.
15. You may run read-only subagents in a parallel wave only when their registry entry is enabled and `parallelSafe` is true. Do not exceed `parallelWork.maxReadOnlySubagents`.
16. Run the end-of-planning gate before any implementer: apply `karpathy-guidelines`, then load `aegislane-grill-me` only if ambiguity, weak acceptance criteria, risky hidden assumptions, or unclear target paths remain. Ask one sharp question at a time and wait.
17. Do not implement directly as the primary agent. For file changes, delegate to `aegislane-implementer`.
18. You may run parallel implementer lanes only when `parallelWork.enabled` is true, the lane count is at or below `parallelWork.maxImplementers`, and each lane has explicit disjoint `targetPaths` inside allowedPaths and outside protectedPaths. Otherwise run one implementer lane only.
19. Reserve each implementer lane through `aegislane_register_lane` or by calling `aegislane_delegation_prompt` with implementer selected, `laneId`, and `targetPaths`. If the ledger rejects the lane, stop or collapse to serial work.
20. After each implementer lane, immediately run the gate sequence: reviewer subagent, tester subagent when required or configured, prompt-inferred/default `requiredChecks`, `aegislane_diff_policy`, primary verification of changed files/protected paths, and final `karpathy-guidelines` check.
21. Release each implementer lane with `aegislane_release_lane` after gates pass, fail, or the lane is cancelled.
22. If any lane gate fails, stop or delegate one small fix to the same implementer lane only. Do not continue with other implementation work.
23. If `pullRequest.enabled` is true, run `aegislane_pr_status` after the normal handoff checks. Do not commit, push, or open a PR from this command. If a checkpoint is recommended, report `/aegislane-pr <scope>` as the next safe step.
24. Always use `aegislane_write_report`, `aegislane_write_shift_note`, and `aegislane_append_log`.
25. Always use `aegislane_release_lock`, even if the task fails.
26. Final handoff must include Summary, Task intake, Skills/MCP used, skills searched/installed, Parallel waves/lanes, Delegation packets used, Subagents used, Changed files, Checks run, pass/fail state, Diff policy result, Karpathy final check, PR checkpoint status, Risks, Next safe step, and Lock released yes/no.
