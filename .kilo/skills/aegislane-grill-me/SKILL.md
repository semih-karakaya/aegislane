---
name: aegislane-grill-me
description: Use in AegisLane when a user wants Superpowers-style clarification, says "grill me", gives an ambiguous request, proposes a new feature, or needs scope, acceptance criteria, risks, and the smallest safe next step sharpened before implementation.
license: MIT
compatibility: kilo-code
metadata:
  owner: aegislane
  workflow: clarification-gate
---

# AegisLane Grill Me

Use this skill before implementation when the task is unclear, broad, risky, or feature-shaped. In normal AegisLane automation, prefer using it at the end of planning after prompt intake, policy defaults, and read-only exploration context have been gathered. Use it immediately only for explicit grill-only requests or prompts that are impossible to parse.

## Goal

Turn a fuzzy user idea into a crisp AegisLane delegation packet without doing implementation work.

## Workflow

1. Run or read the prompt intake result first. Use `aegislane/state/current.json` only for default guardrails and `questioning` policy if available.
2. Decide whether this is grill-only or a normal AegisLane task with an end-of-planning clarification gate.
3. For normal automation, wait until relevant read-only context is available, then ask one question at a time.
4. Prefer high-leverage questions over a checklist dump.
5. Challenge assumptions kindly but directly.
6. Stop when goal, non-goals, acceptance criteria, constraints, likely target paths, checks, and risks are clear enough for one safe step.
7. Summarize the result as a "Ready For AegisLane" packet.

## Question Order

Use the first missing item from this list:

1. What outcome should be true when this is done?
2. What is explicitly out of scope?
3. What should the user be able to observe or test?
4. What files, modules, screens, endpoints, or flows are likely involved?
5. What must not change?
6. What checks prove it worked?
7. What risk would make this a bad change?
8. What is the smallest useful version?

## Grill Style

- Be concise.
- Ask one question, then wait.
- Prefer multiple choice when it reduces friction.
- Say when the request is too broad for one AegisLane step.
- Push back on hidden refactors, vague "make it better" work, and unclear success criteria.
- Do not ask obvious questions whose answer is already in the repo, prompt intake, or current prompt.

## Stop Conditions

Stop questioning and produce the packet when:

- The next safe implementation step is clear.
- The prompt clearly asks for work outside allowed guardrails.
- Protected paths or secrets would be involved.
- The user declines more questions.
- `questioning.maxQuestions` has been reached.

## Ready For AegisLane Packet

Return:

- Goal
- Non-goals
- Acceptance criteria
- Prompt-inferred phase or guardrail fit
- Likely target paths
- Required checks
- Risks
- Smallest safe next step
- Suggested subagents
- Open questions, if any
