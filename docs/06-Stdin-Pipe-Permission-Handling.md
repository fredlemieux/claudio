# Stdin Pipe & Permission Handling

## Current State

Claudio spawns `claude` using a bash wrapper that redirects stdin to `/dev/null`:

```javascript
// src/hooks/useClaude.ts
const bashScript = 'unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_MAX_OUTPUT_TOKENS; exec claude "$@" < /dev/null';
```

The `< /dev/null` was added intentionally to prevent the claude subprocess from blocking on terminal input. It works well for normal streaming output but has a critical side effect:

**Claude Code's interactive permission prompts cannot receive input.** When Claude Code needs confirmation to write to a path outside the working directory (or any path not pre-approved in `settings.json`), it tries to read the user's response from stdin, gets EOF immediately, and fails with "Claude requested permissions to write to X, but you haven't granted it yet."

### Workaround in use

For paths in `~/.claude/` or other sensitive locations, use `Bash` tool with `python3`/`sed` instead of the `Edit`/`Write` tools, which bypass the path-level permission check.

---

## The Proper Fix: Stdin Pipe

The correct solution is to replace `< /dev/null` with a real piped stdin, and handle `permission_request` events from the JSON stream in Claudio's UI.

### How it works

Claude Code emits permission request events on stdout in `stream-json` mode:

```json
{
  "type": "system",
  "subtype": "permission_request",
  "tool": "Write",
  "path": "/some/sensitive/path",
  "description": "Write to /some/sensitive/path"
}
```

Claudio intercepts this event, shows a native approval dialog, and writes the user's response back to the process's stdin:

```json
{"allow": true}
```

### Implementation sketch

**1. Remove `< /dev/null`, use piped stdin**

```typescript
// In useClaude.ts — change the bash script
const bashScript = 'unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_MAX_OUTPUT_TOKENS; exec claude "$@"';

// Pass encoding + stdin pipe in spawn opts
const spawnOpts: Record<string, unknown> = {
  ...(cwd ? { cwd } : {}),
  encoding: "raw",
  stdin: "piped",  // Tauri plugin-shell supports this
};
```

**2. Store stdin writer on childRef**

```typescript
interface SpawnedChild {
  pid: number;
  kill(): Promise<void>;
  write(data: string): Promise<void>;  // add this
}
```

**3. Add permission_request to StreamEvent types**

```typescript
// src/types.ts
type PermissionRequestEvent = {
  type: "system";
  subtype: "permission_request";
  tool: string;
  path?: string;
  description: string;
};
```

**4. Handle in handleStreamEvent**

Parse `permission_request` events and surface them via a new `onPermissionRequest` callback on `StreamEventCallbacks`.

**5. Wire up in useClaude.ts**

```typescript
onPermissionRequest: (req) => setPendingPermission(req),
```

**6. Answer via stdin**

```typescript
const answerPermission = useCallback((allow: boolean) => {
  if (childRef.current && pendingPermission) {
    childRef.current.write(JSON.stringify({ allow }) + "\n");
    setPendingPermission(null);
  }
}, [pendingPermission]);
```

**7. UI: PermissionPrompt component**

Similar pattern to `SelectionPrompt` — shows tool name + path + Allow/Deny buttons. Displayed inline in the message list when `pendingPermission` is set.

---

## Why this was deferred

Getting the original spawn mechanism right (raw binary decoding, line buffering, env unsetting, `< /dev/null` for stdin) was non-trivial. Replacing stdin handling risks regressions in the core stream pipeline. Take care to:

- Test that normal streaming (no permission prompts) is unaffected
- Test the stop/kill path still works correctly
- Verify the Tauri `plugin-shell` `stdin: "piped"` option behaves as expected on macOS
- Ensure the stdin writer is cleaned up on process close

---

## Current mitigation

`~/.claude/settings.json` permissions block:

```json
"permissions": {
  "allow": ["Bash", "Read", "Write", "Edit", "MultiEdit", "Glob", "Grep", ...]
}
```

This pre-approves all standard tools at the tool level. Path-level prompts only appear for writes outside the working directory to sensitive system paths — uncommon in normal use. For those cases, `Bash` + `python3` is the workaround.
