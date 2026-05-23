# Phase 02: Active Development

## Goal
Use AegisLane for guarded day-to-day development after the setup phase is complete.

## Allowed work
- Handle one small safe implementation step per AegisLane run
- Inspect the codebase through read-only subagents
- Delegate implementation only to `aegislane-implementer`
- Update files inside `allowedPaths`
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
- Relevant subagents were used according to `aegislane/subagents.json`
- Required checks were run or a clear reason is recorded
- Diff policy passes
- Protected paths were not touched
- Report and shift note are written
- JSONL run log is appended
- Lock and any lane reservations are released
