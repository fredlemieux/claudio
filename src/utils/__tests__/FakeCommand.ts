/**
 * FakeCommand — drop-in replacement for Tauri's SpawnableCommand.
 *
 * Emits pre-built JSON lines through stdout, then fires close.
 * Used in E2E pipeline tests to verify the full stream→parse→callback flow
 * without spawning a real Claude process.
 *
 * Usage:
 *   const fake = new FakeCommand([
 *     '{"type":"system","subtype":"init","model":"claude-opus-4-6"}',
 *     '{"type":"result","session_id":"sess-1","total_cost_usd":0.05}',
 *   ]);
 *   // Wire up handlers, call spawn(), lines emit async, close fires at end.
 */

type DataCallback = (data: Uint8Array | string) => void;
type CloseCallback = (payload: { code: number | null; signal: string | null }) => void;
type ErrorCallback = (error: string) => void;

export class FakeCommand {
  private stdoutCallbacks: DataCallback[] = [];
  private stderrCallbacks: DataCallback[] = [];
  private closeCallbacks: CloseCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];

  constructor(
    private lines: string[],
    private options: {
      exitCode?: number;
      exitSignal?: string | null;
      emitAsBytes?: boolean;
      stderrLines?: string[];
    } = {},
  ) {}

  stdout = {
    on: (_event: "data", cb: DataCallback) => {
      this.stdoutCallbacks.push(cb);
    },
  };

  stderr = {
    on: (_event: "data", cb: DataCallback) => {
      this.stderrCallbacks.push(cb);
    },
  };

  on(event: "close", cb: CloseCallback): void;
  on(event: "error", cb: ErrorCallback): void;
  on(event: string, cb: CloseCallback | ErrorCallback) {
    if (event === "close") this.closeCallbacks.push(cb as CloseCallback);
    if (event === "error") this.errorCallbacks.push(cb as ErrorCallback);
  }

  async spawn() {
    // Emit lines asynchronously (microtask) to match real Tauri behavior
    queueMicrotask(() => this.emitAll());
    return { pid: 99999, kill: async () => {} };
  }

  private emitAll() {
    const encoder = new TextEncoder();

    // Emit stdout lines
    for (const line of this.lines) {
      const payload = line + "\n";
      const data = this.options.emitAsBytes
        ? encoder.encode(payload)
        : payload;
      for (const cb of this.stdoutCallbacks) cb(data);
    }

    // Emit stderr lines if any
    if (this.options.stderrLines) {
      for (const line of this.options.stderrLines) {
        for (const cb of this.stderrCallbacks) cb(line + "\n");
      }
    }

    // Fire close
    for (const cb of this.closeCallbacks) {
      cb({
        code: this.options.exitCode ?? 0,
        signal: this.options.exitSignal ?? null,
      });
    }
  }

  /** Fire an error event (simulates process spawn failure) */
  emitError(message: string) {
    for (const cb of this.errorCallbacks) cb(message);
  }
}

/**
 * Create a FakeCommand from an array of JSON line strings.
 */
export function loadFixture(lines: string[]): FakeCommand {
  return new FakeCommand(lines);
}

/**
 * Create a FakeCommand from a .jsonl file path.
 * Uses dynamic import to avoid needing @types/node in the main project.
 */
export async function loadFixtureFile(filePath: string): Promise<FakeCommand> {
  const fs = await import("node:fs");
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l: string) => l.trim());
  return new FakeCommand(lines);
}
