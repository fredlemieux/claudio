#!/bin/bash
# Wrapper that clears ALL Claude Code session detection env vars
# before invoking the real claude CLI. Required because Tauri's dev server
# may inherit these from a parent Claude Code session, causing
# claude -p to either hang or exit silently.

# Diagnostic logging to stderr (visible in debug console)
echo "[claude-wrapper] Starting wrapper script" >&2
echo "[claude-wrapper] PATH=$PATH" >&2
echo "[claude-wrapper] HOME=$HOME" >&2
echo "[claude-wrapper] CLAUDECODE=${CLAUDECODE:-unset}" >&2
echo "[claude-wrapper] CLAUDE_CODE_ENTRYPOINT=${CLAUDE_CODE_ENTRYPOINT:-unset}" >&2
echo "[claude-wrapper] which claude: $(which claude 2>&1)" >&2
echo "[claude-wrapper] claude --version: $(claude --version 2>&1)" >&2
echo "[claude-wrapper] Args: $*" >&2

unset CLAUDECODE
unset CLAUDE_CODE_ENTRYPOINT
unset CLAUDE_CODE_MAX_OUTPUT_TOKENS

echo "[claude-wrapper] Env vars unset, executing: claude $*" >&2
exec claude "$@"
