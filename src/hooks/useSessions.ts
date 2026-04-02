import { useState, useCallback } from "react";
import type { Message } from "../types";

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  claudeSessionId?: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "claudio-sessions";
const ACTIVE_KEY = "claudio-active-session";

function loadSessions(): Session[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

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

function generateTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New Chat";
  const text = firstUser.content.slice(0, 50);
  return text.length < firstUser.content.length ? `${text}...` : text;
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(getActiveId);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

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
      saveSessions(next);
      return next;
    });
    setActiveSessionId(session.id);
    setActiveId(session.id);
    return session;
  }, []);

  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setActiveId(id);
  }, []);

  const updateMessages = useCallback((sessionId: string, messages: Message[]) => {
    setSessions((prev) => {
      const next = prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              messages,
              title: s.title === "New Chat" ? generateTitle(messages) : s.title,
              updatedAt: Date.now(),
            }
          : s
      );
      saveSessions(next);
      return next;
    });
  }, []);

  const setClaudeSessionId = useCallback((sessionId: string, claudeSessionId: string) => {
    setSessions((prev) => {
      const next = prev.map((s) =>
        s.id === sessionId ? { ...s, claudeSessionId } : s
      );
      saveSessions(next);
      return next;
    });
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSessions(next);
      return next;
    });
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setActiveId(null);
    }
  }, [activeSessionId]);

  return {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    switchSession,
    updateMessages,
    setClaudeSessionId,
    deleteSession,
  };
}
