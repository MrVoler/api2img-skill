# Adapter Layout

This folder contains agent-specific adapter files that wrap the shared api2img runtime.

- `codex/` contains Codex skill files.
- `claude-code/` contains Claude Code command prompts.
- `openclaw/` contains OpenClaw skill files.
- `hermes/` contains Hermes skill files.
- `generic/` contains a fallback prompt/instruction file for unsupported agents.

The shared runtime is the cross-platform `npx api2img ...` CLI.
