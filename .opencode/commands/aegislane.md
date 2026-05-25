---
description: Run AegisLane guarded autonomous developer loop
agent: aegislane
---

Run AegisLane using the cache-friendly guarded workflow below. Keep this static instruction prefix intact; the user task appears at the end.

Required sequence:
1. Load `aegislane-skill-finder` with OpenCode's native `skill` tool when available.
2. Treat the user task at the end of this command as the source of truth. Do not require the user to edit `aegislane/state/current.json` before ordinary work.
3. Use `aegislane_validate_memory` with safe defaults, then use compact `aegislane_task_intake` on the user task to infer phase, target paths, checks, risk, clarification needs, execution profile, and parallel plan.
4. If compact task intake returns `profile: "fast"` and `fast: true`, run the fast path: acquire the lock with `executionProfile: "fast"`, edit directly only inside target paths, run `aegislane_diff_policy` plus inferred/default checks, append a compact JSONL log if available, release the lock, and give a concise handoff. Skip subagents, delegation prompts, lane ledger, report, shift note, tester/reviewer gates, and PR status for this fast path; then stop.
5. Read `aegislane/models.json`, `aegislane/policies/skill-discovery.json`, and current.json only as default guardrails and policy fallback.
6. Load required skills from the skill discovery policy when available. Load `find-skills` only for capability or skill-install questions, and load `karpathy-guidelines` for standard/guarded coding discipline.
7. If a task-critical skill is missing, run `npx skills find <specific query>`. If auto-install is enabled, install only clearly relevant trusted skills within the configured per-run limit.
8. Load directly relevant available skills before planning.
9. Use available MCP/docs tools, especially `context7`, when current official documentation is needed.
10. Use compact `aegislane_read_current`, `aegislane_read_phase`, `aegislane_read_skill_discovery`, `aegislane_read_models`, `aegislane_read_subagents`, and `aegislane_read_lanes` before changing files. Pass `full: true` only when the compact result or policyRefs are insufficient.
11. Use `aegislane_acquire_lock` before implementation. If the lock already exists, stop.
12. Use `aegislane_preflight`.
13. Read `parallelWork`, `questioning`, `pullRequest`, and `maxSafeStepMinutes` from task intake/current defaults and obey their limits.
14. Use `aegislane_delegation_prompt` to create a complete delegation packet for each selected subagent. Include task intake, skills/MCP context, wave id, lane id, and target paths for every implementer lane.
15. Read `aegislane/subagents.json` as the source of truth for subagent selection. Invoke only the fewest enabled subagents whose conditions materially match.
16. You may run read-only subagents in a parallel wave only when their registry entry is enabled and `parallelSafe` is true. Do not exceed `parallelWork.maxReadOnlySubagents`.
17. Run the end-of-planning gate before any implementer: apply `karpathy-guidelines`, then load `aegislane-grill-me` only if ambiguity, weak acceptance criteria, risky hidden assumptions, or unclear target paths remain. Ask one sharp question at a time and wait.
18. Do not implement directly as the primary agent outside the fast path. For standard/guarded file changes, delegate to `aegislane-implementer`.
19. You may run parallel implementer lanes only when `parallelWork.enabled` is true, the lane count is at or below `parallelWork.maxImplementers`, and each lane has explicit disjoint `targetPaths` inside allowedPaths and outside protectedPaths. Otherwise run one implementer lane only.
20. For a parallel wave, reserve all lanes through `aegislane_register_lane` or by calling `aegislane_delegation_prompt` with implementer selected, `laneId`, and `targetPaths` before invoking implementers. If any reservation is rejected, release reservations you created and stop or collapse to serial work.
21. Start all reserved implementer lanes in the wave before waiting on gate work. After the wave finishes, run reviewer subagents per lane, tester subagent only when required/configured or checks fail, prompt-inferred/default `requiredChecks`, `aegislane_diff_policy`, primary verification of changed files/protected paths, and final `karpathy-guidelines` check. When `parallelWork.gateAfterParallelWave` is true, run checks and diff policy once for the combined wave.
22. Release each implementer lane with `aegislane_release_lane` after wave gates pass, fail, or the lane is cancelled.
23. If any lane gate fails, stop or delegate one small fix to the same implementer lane only. Do not continue with other implementation work.
24. If `pullRequest.enabled` is true, run `aegislane_pr_status` after the normal handoff checks. Do not commit, push, or open a PR from this command. If a checkpoint is recommended, report `/aegislane-pr <scope>` as the next safe step.
25. For standard/guarded handoff, use `aegislane_write_report`, `aegislane_write_shift_note`, and `aegislane_append_log`.
26. Always use `aegislane_release_lock`, even if the task fails.
27. Standard/guarded final handoff must include Summary, Task intake, Skills/MCP used, skills searched/installed, Parallel waves/lanes, Delegation packets used, Subagents used, Changed files, Checks run, pass/fail state, Diff policy result, Karpathy final check, PR checkpoint status, Risks, Next safe step, and Lock released yes/no.

User task:

$ARGUMENTS
