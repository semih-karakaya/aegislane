---
description: Grill a task into a crisp AegisLane scope before implementation
agent: aegislane
---

Run the AegisLane grill-only clarification workflow for this idea:

$ARGUMENTS

This command is for questioning, scope sharpening, and acceptance criteria only.

Rules:
1. Load `aegislane-skill-finder` and `aegislane-grill-me` when available.
2. Run `aegislane_task_intake` on `$ARGUMENTS`; use `aegislane/state/current.json` only for default guardrails and `questioning` policy.
3. Do not implement.
4. Do not invoke `aegislane-implementer`.
5. Do not reserve lanes.
6. Do not commit, push, open a PR, merge, or deploy.
7. Ask one sharp question at a time and wait for the user's answer.
8. Prefer questions that expose goal, non-goals, acceptance criteria, constraints, risk boundaries, target paths, checks, and rollout expectations.
9. Challenge vague, oversized, or contradictory requests directly but constructively.
10. Stop after `questioning.maxQuestions` questions unless the user explicitly asks to continue.
11. When enough context exists, produce a concise "Ready For AegisLane" packet with:
    - Goal
    - Non-goals
    - Acceptance criteria
    - Prompt-inferred phase or guardrail fit
    - Likely target paths
    - Required checks
    - Risks
    - Smallest safe next step
    - Suggested subagents

If the user says to proceed after the packet, then run the normal guarded AegisLane workflow in the selected `aegislane` agent/mode.
