import { useCallback, useState } from "react";

export function usePromptQueue() {
  const [queue, setQueue] = useState<string[]>([]);

  const enqueue = useCallback((text: string) => {
    setQueue((q) => [...q, text]);
  }, []);

  const remove = useCallback((index: number) => {
    setQueue((q) => q.filter((_, i) => i !== index));
  }, []);

  const dequeue = useCallback((): string | undefined => {
    let first: string | undefined;
    setQueue((q) => {
      first = q[0];
      return q.slice(1);
    });
    return first;
  }, []);

  const clear = useCallback(() => setQueue([]), []);

  return { queue, enqueue, remove, dequeue, clear };
}

// Pure functions for testing without React
export function enqueueItem(queue: string[], text: string): string[] {
  return [...queue, text];
}

export function removeItem(queue: string[], index: number): string[] {
  return queue.filter((_, i) => i !== index);
}

export function dequeueItem(queue: string[]): { next: string | undefined; remaining: string[] } {
  return { next: queue[0], remaining: queue.slice(1) };
}
