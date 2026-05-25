---
name: aegislane-skill-finder
description: Use at the start of every AegisLane task to inspect available Kilo Code skills, choose relevant skills, and decide whether to search/install additional skills with npx skills.
license: MIT
compatibility: kilo-code
metadata:
  owner: aegislane
  workflow: skill-discovery
---

# AegisLane Skill Finder

Use this skill at the beginning of every AegisLane run, before exploration or implementation.

## Goal

Pick the smallest useful set of skills and MCP tools for the current task, then hand that context to the AegisLane primary agent and relevant subagents.

## Required Workflow

1. Inspect the available skills shown by Kilo Code's native `skill` tool.
2. Load this skill first.
3. Read `aegislane/policies/skill-discovery.json` when available.
4. Load available skills listed in `requiredSkills`. For a task intake `fast` profile, stop there unless another skill is clearly task-critical.
5. Load `find-skills` only when the user asks about capabilities, workflows, tools, installable extensions, or no local skill fits a repeatable domain.
6. Load `karpathy-guidelines` when standard or guarded work involves coding, review, refactor, debugging, planning, or acceptance criteria. For fast profile edits, use a brief internal checklist instead unless the edit is code-sensitive.
7. For normal automation, defer `aegislane-grill-me` until the end-of-planning gate after prompt intake and read-only context are gathered. Load it immediately only for explicit grill-only requests or prompts that cannot be parsed.
8. Load any directly relevant available skill before planning.
9. If the task involves an external library, SDK, framework, API, cloud service, CLI, or Kilo Code configuration, prefer official docs through MCP/docs tools such as `context7` when available.
10. If no local skill fits and the task belongs to a repeatable domain, search the skills ecosystem with `npx skills find <specific query>`.
11. If `autoInstall.enabled` is true, install only clearly relevant high-trust skills, at most `autoInstall.maxInstallsPerRun` per run. Respect `autoInstall.allowedSources`, `autoInstall.requireTrustedSource`, and `autoInstall.minInstalls` when visible in search output.
12. Use global install commands. Prefer `npx skills add <source> --skill <name> -g -y` when source and skill name are known, or the exact `npx skills add <owner/repo@skill> -g -y` package returned by search.
13. If a candidate is low-trust, below install threshold, broad, or only loosely related, do not install it; record it as skipped.
14. Record skills loaded, searched, installed, skipped, and MCP tools used in the AegisLane report/final handoff, or compact JSONL log for fast profile tasks.

## Search Query Hints

- UI tasks: `ui ux accessibility frontend design`
- React or Next.js: `react nextjs typescript`
- Tests: `testing jest playwright e2e`
- Security: `security code review`
- Docs/API uncertainty: `docs <library name>`
- Mobile: `ios swiftui react native expo flutter`
- Database/API: `postgres supabase api`
- Kilo Code configuration: `kilo code agent skills mcp`
- PR publishing: `github pull request publish gh`

## Stop Conditions

Stop skill discovery and continue with the guarded workflow when:

- A relevant local skill has been loaded.
- Official docs/MCP context has answered the uncertainty.
- No relevant trusted skill exists.
- The per-run auto-install limit has been reached.
- Installing a skill would require an untrusted or ambiguous source.

## Output To Primary

Return:

- Skills loaded
- Skills considered but skipped
- Skills searched
- Skills installed
- MCP tools/docs sources used
- Additional skill install candidates, if any
- How the skill context changes the implementation plan
