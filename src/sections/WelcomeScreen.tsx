import type { Session } from "../hooks/useSessions";

interface WelcomeScreenProps {
  sessions: Session[];
  onSwitchSession: (id: string) => void;
  onSetInput: (value: string) => void;
  onFocusInput: () => void;
}

export function WelcomeScreen({ sessions, onSwitchSession, onSetInput, onFocusInput }: WelcomeScreenProps) {
  const quickActions = [
    { label: "Research a topic", icon: "🔍", input: "/research " },
    { label: "Browse a website", icon: "🌐", input: "/browser " },
    { label: "Review code", icon: "📝", input: "Review the code in " },
    { label: "Create a plan", icon: "📋", input: "Create a plan for " },
  ];

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-semibold text-[#e2e8f0] mb-1">Claudio</h1>
        <p className="text-[#475569] text-sm mb-6">PAI-powered GUI for Claude Code</p>

        <div className="grid grid-cols-2 gap-2 mb-6">
          {quickActions.map((item) => (
            <button
              key={item.label}
              onClick={() => { onSetInput(item.input); onFocusInput(); }}
              className="flex items-center gap-2 px-3 py-2.5 bg-[#12121e] border border-[#1e1e3a] rounded-xl text-xs text-[#94a3b8] hover:text-[#e2e8f0] hover:border-[#2a2a4a] transition-all text-left"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {sessions.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] text-[#334155] uppercase tracking-wider mb-2">Recent</p>
            <div className="space-y-1">
              {sessions.slice(0, 3).map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSwitchSession(s.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-[#12121e] border border-[#1e1e3a] rounded-lg text-xs text-[#475569] hover:text-[#94a3b8] hover:border-[#2a2a4a] transition-all text-left"
                >
                  <span className="truncate flex-1">{s.title}</span>
                  <span className="text-[10px] text-[#334155] shrink-0">
                    {s.messages.length} msg{s.messages.length !== 1 ? "s" : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-[#334155] text-xs">
          <span>Type</span>
          <kbd className="bg-[#12121e] px-1.5 py-0.5 rounded border border-[#1e1e3a] text-[#475569]">/</kbd>
          <span>for skills or</span>
          <kbd className="bg-[#12121e] px-1.5 py-0.5 rounded border border-[#1e1e3a] text-[#475569]">⌘K</kbd>
          <span>to search</span>
        </div>
        <div className="mt-3 flex items-center justify-center gap-3 text-[#334155] text-[10px]">
          <span>⌘N new chat</span>
          <span>⌘, settings</span>
          <span>Esc stop</span>
        </div>
      </div>
    </div>
  );
}
