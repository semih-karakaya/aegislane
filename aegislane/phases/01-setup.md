# Phase 01: Setup

## Goal
Prepare the project for AegisLane guarded autonomous development.

## Allowed work
- Add OpenCode plugin files
- Add OpenCode agent files
- Add OpenCode command files
- Add OpenCode custom tools
- Add guarded PR checkpoint command and publisher subagent
- Add AegisLane memory files
- Add minimal guardrail scripts

## Not allowed
- Product feature changes
- Auth changes
- Payment changes
- Database migrations
- Deployment changes
- App Store metadata changes
- Large refactors

## Done criteria
- AegisLane mode or agent exists
- AegisLane command exists
- AegisLane plugin exists
- AegisLane tools exist
- aegislane/state/current.json exists
- aegislane/subagents.json exists
- Locking works
- Preflight works
- Diff policy works
- PR checkpoint status works
- Report and shift note are written
- Lock is released after run
