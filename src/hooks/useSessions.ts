import { useState, useCallback } from "react";
import type { Message } from "../types";

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  claudeSessionId?: string;
  workingDirectory?: string;
  createdAt: number;
  updatedAt: number;
}

/** Stored in the index — no messages, just metadata */
interface SessionMeta {
  id: string;
  title: string;
  claudeSessionId?: string;
  workingDirectory?: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

const INDEX_KEY = "claudio-sessions-index";
const ACTIVE_KEY = "claudio-active-session";
const MSG_PREFIX = "claudio-msg-";

// --- Index (lightweight metadata) ---

function loadIndex(): SessionMeta[] {
  try {
    const stored = localStorage.getItem(INDEX_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveIndex(metas: SessionMeta[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(metas));
}

// --- Per-session messages ---

function loadMessages(sessionId: string): Message[] {
  try {
    const stored = localStorage.getItem(MSG_PREFIX + sessionId);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveMessages(sessionId: string, messages: Message[]) {
  try {
    // Strip steps (raw stream JSON) — too large to persist
    const lite = messages.map(({ steps, ...rest }) => rest);
    localStorage.setItem(MSG_PREFIX + sessionId, JSON.stringify(lite));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      // Truncate to last N messages to fit
      const truncated = messages.slice(-20).map(({ steps, ...rest }) => rest);
      try {
        localStorage.setItem(MSG_PREFIX + sessionId, JSON.stringify(truncated));
      } catch {
        // Give up on this session's messages
        localStorage.removeItem(MSG_PREFIX + sessionId);
      }
    }
  }
}

function deleteMessages(sessionId: string) {
  localStorage.removeItem(MSG_PREFIX + sessionId);
}

// --- Migration from old single-blob format ---

function migrateIfNeeded(): { metas: SessionMeta[]; sessions: Session[] } | null {
  const oldKey = "claudio-sessions";
  const old = localStorage.getItem(oldKey);
  if (!old) return null;

  try {
    const oldSessions: Session[] = JSON.parse(old);
    if (!Array.isArray(oldSessions) || oldSessions.length === 0) {
      localStorage.removeItem(oldKey);
      return null;
    }

    const metas: SessionMeta[] = [];
    for (const s of oldSessions) {
      metas.push({
        id: s.id,
        title: s.title,
        claudeSessionId: s.claudeSessionId,
        workingDirectory: s.workingDirectory,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        messageCount: s.messages.length,
      });
      saveMessages(s.id, s.messages);
    }
    saveIndex(metas);
    localStorage.removeItem(oldKey);
    return { metas, sessions: oldSessions };
  } catch {
    localStorage.removeItem(oldKey);
    return null;
  }
}

// --- Active session ---

function getActiveId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

function setActiveId(id: string | null) {
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

// --- Helpers ---

function generateTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New Chat";
  const text = firstUser.content.slice(0, 50);
  return text.length < firstUser.content.length ? `${text}...` : text;
}

function metaFromSession(s: Session): SessionMeta {
  return {
    id: s.id,
    title: s.title,
    claudeSessionId: s.claudeSessionId,
    workingDirectory: s.workingDirectory,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    messageCount: s.messages.length,
  };
}

function hydrateSession(meta: SessionMeta): Session {
  return {
    id: meta.id,
    title: meta.title,
    claudeSessionId: meta.claudeSessionId,
    workingDirectory: meta.workingDirectory,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    messages: loadMessages(meta.id),
  };
}

// --- Initial load ---

function loadSessions(): Session[] {
  // Migrate old single-blob format if present
  const migrated = migrateIfNeeded();
  if (migrated) return migrated.sessions;

  const metas = loadIndex();
  return metas.map(hydrateSession);
}

// --- Hook ---

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(getActiveId);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  const persist = useCallback((next: Session[]) => {
    saveIndex(next.map(metaFromSession));
  }, []);

  const createSession = useCallback((): Session => {
    const session: Session = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => {
      const next = [session, ...prev];
      persist(next);
      return next;
    });
    setActiveSessionId(session.id);
    setActiveId(session.id);
    return session;
  }, [persist]);

  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setActiveId(id);
  }, []);

  const updateMessages = useCallback((sessionId: string, messages: Message[]) => {
    setSessions((prev) => {
      const exists = prev.some((s) => s.id === sessionId);
      const next = exists
        ? prev.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages,
                  title: s.title === "New Chat" ? generateTitle(messages) : s.title,
                  updatedAt: Date.now(),
                }
              : s
          )
        : // Session was just created but setSessions hasn't flushed yet — inject it
          [
            {
              id: sessionId,
              title: generateTitle(messages),
              messages,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            ...prev,
          ];
      persist(next);
      saveMessages(sessionId, messages);
      return next;
    });
  }, [persist]);

  const setClaudeSessionId = useCallback((sessionId: string, claudeSessionId: string) => {
    setSessions((prev) => {
      const next = prev.map((s) =>
        s.id === sessionId ? { ...s, claudeSessionId } : s
      );
      persist(next);
      return next;
    });
  }, [persist]);

  const setWorkingDirectory = useCallback((sessionId: string, workingDirectory: string) => {
    setSessions((prev) => {
      const next = prev.map((s) =>
        s.id === sessionId ? { ...s, workingDirectory } : s
      );
      persist(next);
      return next;
    });
  }, [persist]);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persist(next);
      deleteMessages(id);
      return next;
    });
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setActiveId(null);
    }
  }, [activeSessionId, persist]);

  return {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    switchSession,
    updateMessages,
    setClaudeSessionId,
    setWorkingDirectory,
    deleteSession,
  };
}
