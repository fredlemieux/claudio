#!/bin/bash
# Wrapper that clears ALL Claude Code session detection env vars
# before invoking the real claude CLI. Required because Tauri's dev server
# may inherit these from a parent Claude Code session, causing
# claude -p to either hang or exit silently.
unset CLAUDECODE
unset CLAUDE_CODE_ENTRYPOINT
unset CLAUDE_CODE_MAX_OUTPUT_TOKENS
exec claude "$@"
