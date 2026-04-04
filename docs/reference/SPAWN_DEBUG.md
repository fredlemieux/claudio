# Spawn Debug Log: Claude -p stdout silence

> Last updated: 2026-04-04
> Status: UNSOLVED — claude -p via spawn() produces zero stdout
> Goal: Get real-time streaming from `claude -p --output-format stream-json` via Tauri shell spawn()

---

## The Problem

When spawning `claude -p "message" --output-format stream-json --model sonnet` via Tauri's
`Command.create().spawn()`, **zero stdout events fire**. The process appears to hang silently —
no stdout, no stderr, no error. Eventually hits our timeout warning.

Meanwhile, `execute()` with the same args works perfectly and returns full output.

---

## Environment

- Tauri 2 (tauri-plugin-shell 2.3.5)
- Claude Code CLI 2.1.72
- macOS Darwin 25.3.0
- App launched from Claude Code terminal session (CLAUDECODE env var present)
- React + Vite frontend

---

## What Works vs What Doesn't

| Command | Method | encoding | Result |
|---------|--------|----------|--------|
| `claude --version` | execute() | default | ✅ Returns "2.1.72 (Claude Code)" |
| `claude --help` | execute() | default | ✅ Returns 7561 chars |
| `claude --help` | spawn() | raw | ✅ 1 chunk, 7561 chars |
| `bash -c 'sleep 2 && echo ...'` | spawn() | raw | ✅ 3 chunks over 4s, perfect timing |
| `claude -p "test" --output-format stream-json` | execute() | default | ✅ Returns ~1146 chars of JSON events |
| `claude -p "test" --output-format stream-json` | spawn() | default | ❌ 0 stdout events, 0 stderr |
| `claude -p "test" --output-format stream-json` | spawn() | raw | ❌ 0 stdout events, 0 stderr |
| Same via bash wrapper (unset CLAUDECODE) | spawn() | raw | ❌ 0 stdout events (UNTESTED — just implemented) |

---

## Things We've Tried (Chronological)

### Session 1 (2026-04-02 night)

1. **Basic spawn()** — wired stdout.on('data'), got nothing
2. **Line buffer fix** — Tauri delivers data line-by-line without trailing \n, so split("\n") found
   nothing. Fixed by processing each data event directly. Didn't help — data events never fire.
3. **Added shell:allow-execute** — execute() was failing due to missing permission. Added scoped
   `shell:allow-execute` to capabilities. execute() then worked, spawn() still silent.
4. **env: { CLAUDECODE: "" }** — Tried stripping CLAUDECODE. Discovered Tauri's `env` option
   REPLACES the entire process environment instead of merging. This stripped PATH, HOME, etc.,
   causing claude to hang then get killed (signal=9). REVERTED.
5. **Wrapper script** — Created `src-tauri/scripts/claude-wrapper.sh` to unset env vars. But Tauri
   shell uses PATH lookup only — relative paths don't resolve. Script never ran.
6. **Switch to execute()** — As workaround, switched to execute() which works but doesn't stream.

### Session 2 (2026-04-03 evening)

7. **Research Tauri Issue #1632** — Found known issue: spawn() buffers stdout until newline. Fix is
   `{ encoding: 'raw' }` in Command.create options. Implemented but didn't solve the problem.
8. **Diagnostic battery** — Added 4 diagnostic tests before main spawn:
   - [1/4] execute() --version → ✅ works
   - [2/4] execute() --help → ✅ works
   - [3/4] spawn() bash sleep+echo (raw) → ✅ works perfectly, 3 chunks over 4s
   - [4/4] spawn() claude --help (raw) → ✅ works, 7561 chars in 1 chunk
   - Main spawn() claude -p (raw) → ❌ still zero stdout
9. **Bash wrapper via spawn** — Since bash is now in shell scope, wrapped via
   `bash -c 'unset CLAUDECODE ...; exec claude "$@"' -- args...`. NOT YET TESTED from Tauri.
10. **Timeout extended** — Warning timeout increased from 5s to 15s.

### Session 3 (2026-04-04 early morning) — CRITICAL FINDINGS

11. **Terminal test: claude -p hangs from within Claude Code session** — ran `claude -p "hi" --model
    haiku` directly from Claude Code's Bash tool (not Tauri). Zero stdout, zero stderr. Even with
    `unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_MAX_OUTPUT_TOKENS`. Even with `env -i`.
    **THIS PROVES THE ISSUE IS NOT TAURI — it's Claude Code nesting detection.**

12. **Zombie processes discovered** — Found `claude -p` processes that had been hanging for 2 DAYS
    (PID 73610 from Friday 2am). Killed them. Did not fix the issue.

13. **Clean environment test** — `env -i HOME=... PATH=... claude -p "hi"` still produces zero
    output. The nesting detection goes BEYOND environment variables.

14. **setsid / pseudo-TTY tests** — `setsid` not available on macOS. `script` (pseudo-TTY) failed
    with "Operation not supported on socket". Could not test PTY approach.

15. **Environment analysis** — Found these Claude-related env vars present:
    - `CLAUDECODE=1`
    - `CLAUDE_CODE_ENTRYPOINT=cli`
    - `CLAUDE_CODE_MAX_OUTPUT_TOKENS=80000`
    - `PAI_DIR=/Users/freddylem/.claude`
    - `PAI_CONFIG_DIR=/Users/freddylem/.config/PAI`

16. **Key observation: execute() vs Bash tool** — The earlier session claimed execute() worked from
    Tauri. But from Claude Code's Bash tool, `claude -p` also hangs. Either:
    a) execute() worked in a PREVIOUS session where conditions were different, OR
    b) Tauri's execute() somehow bypasses the nesting detection that the Bash tool hits

**SESSION 3 CONCLUSION (LATER REVISED):** Initially concluded the problem was nesting detection
beyond env vars. This was WRONG — see Session 4 below.

### Session 4 (2026-04-04 morning) — ROOT CAUSE FOUND ✅

17. **stdin EOF is the real root cause** — Tauri `spawn()` keeps stdin piped open with NO JS-side
    close API (Tauri Issue #2136). Claude `-p` waits for stdin EOF before processing (Claude Issue
    #34455). Without EOF, it hangs forever producing zero output.

18. **`< /dev/null` fixes it** — Wrapping via bash with `< /dev/null` gives claude immediate stdin
    EOF. Verified: `claude -p "say hello" --model haiku < /dev/null` → 152 bytes of output. WORKS!

19. **`execute()` auto-closes stdin** — Tauri's `execute()` uses Rust's `std::process::Command::output()`
    which drops the stdin handle immediately, providing EOF. That's why execute() always worked.

20. **`--verbose` required for stream-json** — Discovered error: "When using --print,
    --output-format=stream-json requires --verbose". Added `--verbose` to args.

21. **Full streaming verified** — `claude -p "say hello in 3 words" --output-format stream-json
    --verbose --model haiku < /dev/null` → 213KB of valid NDJSON with system, assistant, and result
    events. Real-time streaming confirmed.

22. **Research agents confirmed findings** — Three parallel research agents verified:
    - Tauri spawn() uses `BufReader::lines()` on piped stdout (confirmed in Rust source)
    - Claude CLI stdin issue documented in GitHub Issues #25670, #29543, #9026
    - Existing GUI wrappers (Opcode, OpenCovibe) all use stream-json via CLI spawn
    - Claude Agent SDK requires Node.js runtime (not viable in Tauri WebView directly)

---

## ROOT CAUSE (CONFIRMED)

**Two interacting issues:**

1. **Tauri `spawn()` keeps stdin piped open** — No JS API to close it (Tauri Issue #2136). Claude
   `-p` reads stdin looking for EOF before processing the `-p` argument.

2. **`--output-format stream-json` requires `--verbose`** — When used with `-p` mode, the CLI
   errors silently without `--verbose`.

**Why `execute()` worked:** It uses `std::process::Command::output()` which drops stdin immediately,
providing the EOF that claude needs.

**Why `--help` and `--version` worked via spawn():** They don't read stdin at all — they print and
exit regardless of stdin state.

## The Fix

```typescript
// Bash wrapper: unset nesting env vars + redirect stdin from /dev/null
const bashScript = 'unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_MAX_OUTPUT_TOKENS; exec claude "$@" < /dev/null';
const bashArgs = ["-c", bashScript, "--", "-p", message, "--output-format", "stream-json", "--verbose", "--model", model];
const command = Command.create("bash", bashArgs, { encoding: "raw" });
```

Key elements:
- `< /dev/null` — immediate stdin EOF
- `unset CLAUDECODE` — prevent nested session detection
- `--verbose` — required for stream-json with -p
- `encoding: 'raw'` — bypass Tauri Issue #1632 (stdout buffered until newline)
- TextDecoder with `{ stream: true }` — decode raw Uint8Array chunks

---

## Key Observations (Updated)

1. **spawn() works perfectly for non-interactive commands** — --version, --help, bash scripts all
   deliver stdout events correctly with encoding=raw.

2. **spawn() fails for `claude -p` without stdin EOF** — because claude waits for stdin to close
   before processing the prompt.

3. **execute() works because it auto-closes stdin** — Rust's `output()` method drops the stdin pipe.

4. **`< /dev/null` is the fix** — gives claude immediate stdin EOF via bash wrapper.

5. **`--verbose` is required** — stream-json output format needs --verbose flag with -p mode.

---

## Hypotheses — Final Status

| # | Hypothesis | Status | Notes |
|---|-----------|--------|-------|
| H1 | CLAUDECODE env var | **Partial** | Contributes but not sole cause |
| H2 | Stale --resume session | **Not tested** | Unrelated to root cause |
| H3 | stdin handling in -p mode | **✅ ROOT CAUSE** | stdin EOF required — `< /dev/null` fixes it |
| H4 | Node.js stdout buffering | **Contributing** | Solved by `encoding: 'raw'` |
| H5 | spawn() vs execute() pipes | **✅ CONFIRMED** | execute() auto-closes stdin, spawn() doesn't |
| H6 | Non-TTY behavior | **Minor** | stream-json flushes per-line, not an issue |
| H7 | Agent SDK alternative | **Researched** | Requires Node.js sidecar, not for v1 |
| H8 | Rust-side spawning | **Researched** | Viable future option, not needed now |

---

## Conclusion — SOLVED ✅ (2026-04-04)

**Status:** Fully working. Real-time streaming confirmed from Tauri app.

### What Was Wrong

Two independent issues combined to produce the symptom of "zero stdout from spawn()":

1. **stdin EOF (primary):** Tauri's `spawn()` keeps stdin piped open with no JS-side API to close it
   (Tauri Issue #2136). Claude Code's `-p` mode waits for stdin EOF before it starts processing the
   prompt. Without EOF, the process hangs forever producing zero output. Tauri's `execute()` worked
   because Rust's `std::process::Command::output()` drops the stdin handle immediately, providing
   EOF. Fix: `< /dev/null` via bash wrapper.

2. **Missing --verbose flag (secondary):** `--output-format stream-json` requires `--verbose` when
   used with `-p` mode. Without it, the CLI exits with an error — but because stdin was also hung
   (issue #1), this error was never visible. Once stdin was fixed, the missing flag surfaced as a
   clear error message.

Neither issue alone would have been obvious. The stdin hang masked the --verbose error, and the
--verbose error would have been a quick fix if stdin had been working. Together they created the
appearance of a deep, mysterious problem that took 4 sessions to diagnose.

### What Was NOT Wrong

- **Not Tauri buffering** — `encoding: 'raw'` helps but wasn't the root cause
- **Not nesting detection** — `CLAUDECODE` env var contributes but unsetting it alone doesn't fix it
- **Not process tree inspection** — Claude Code uses only env vars for nesting, not ppid/sockets
- **Not stdout pipe buffering** — stream-json mode flushes per-line correctly

### The Fix (5 lines)

```typescript
const bashScript = 'unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_MAX_OUTPUT_TOKENS; exec claude "$@" < /dev/null';
const bashArgs = ["-c", bashScript, "--", ...args]; // args includes --verbose
const command = Command.create("bash", bashArgs, { encoding: "raw" });
```

### Verified Output (from Tauri app, 2026-04-04)

- 36 stdout chunks received over ~20 seconds
- Event types seen: system (hook_started, hook_response, init), assistant (thinking + text), rate_limit_event, result
- Session ID captured: `134c1ec5-e1d3-4e9c-a76f-d6cf007a40db`
- Cost captured: $0.181374
- Assistant text rendered in chat: 399 chars

### Future Improvements
- [ ] Study Opcode (github.com/winfunc/opcode) for production patterns
- [ ] Consider `--input-format stream-json` for bidirectional streaming
- [ ] Evaluate Node.js sidecar + Agent SDK for v2 architecture
- [ ] Custom Rust `#[tauri::command]` with portable-pty for cross-platform PTY

---

*Debug log maintained by Greg for Fred — updated each session*
