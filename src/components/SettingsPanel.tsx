import { useState } from "react";

export type ClaudeModel = "opus" | "sonnet" | "haiku";

interface Settings {
  userName: string;
  assistantName: string;
  theme: "dark" | "light";
  model: ClaudeModel;
  showAlgorithm: boolean;
  voiceEnabled: boolean;
  autoOpenAgentDrawer: boolean;
  showToolCalls: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  userName: "Fred",
  assistantName: "Greg",
  theme: "dark",
  model: "sonnet",
  showAlgorithm: false,
  voiceEnabled: false,
  autoOpenAgentDrawer: true,
  showToolCalls: true,
};

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem("claudio-settings");
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: Settings) {
  localStorage.setItem("claudio-settings", JSON.stringify(settings));
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  const updateSettings = (partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  };

  return { settings, updateSettings };
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { settings, updateSettings } = useSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[480px] bg-[#12121e] border border-[#1e1e3a] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e3a]">
          <h2 className="text-sm font-semibold text-[#e2e8f0]">Settings</h2>
          <button
            onClick={onClose}
            className="text-[#475569] hover:text-[#94a3b8] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Settings groups */}
        <div className="p-5 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Identity */}
          <div>
            <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Identity</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#475569] mb-1 block">Your name</label>
                <input
                  type="text"
                  value={settings.userName}
                  onChange={(e) => updateSettings({ userName: e.target.value })}
                  className="w-full bg-[#0a0a14] border border-[#1e1e3a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-[#475569] mb-1 block">Assistant name</label>
                <input
                  type="text"
                  value={settings.assistantName}
                  onChange={(e) => updateSettings({ assistantName: e.target.value })}
                  className="w-full bg-[#0a0a14] border border-[#1e1e3a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          </div>

          {/* Model */}
          <div>
            <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Model</h3>
            <div className="flex gap-2">
              {(["opus", "sonnet", "haiku"] as const).map((model) => (
                <button
                  key={model}
                  onClick={() => updateSettings({ model })}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    settings.model === model
                      ? "bg-blue-600 text-white"
                      : "bg-[#0a0a14] text-[#475569] border border-[#1e1e3a] hover:text-[#94a3b8]"
                  }`}
                >
                  {model.charAt(0).toUpperCase() + model.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#334155] mt-1.5">
              Model used for Claude Code sessions
            </p>
          </div>

          {/* Display */}
          <div>
            <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Display</h3>
            <div className="space-y-3">
              <Toggle
                label="Show Algorithm tracker"
                description="Display phase progression and ISC panel"
                checked={settings.showAlgorithm}
                onChange={(v) => updateSettings({ showAlgorithm: v })}
              />
              <Toggle
                label="Auto-open Agent drawer"
                description="Open drawer when agents spawn"
                checked={settings.autoOpenAgentDrawer}
                onChange={(v) => updateSettings({ autoOpenAgentDrawer: v })}
              />
              <Toggle
                label="Show tool calls"
                description="Display tool usage inline in chat"
                checked={settings.showToolCalls}
                onChange={(v) => updateSettings({ showToolCalls: v })}
              />
            </div>
          </div>

          {/* Audio */}
          <div>
            <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Audio</h3>
            <Toggle
              label="Voice notifications"
              description="Play voice announcements for phase changes"
              checked={settings.voiceEnabled}
              onChange={(v) => updateSettings({ voiceEnabled: v })}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1e1e3a] flex items-center justify-between">
          <span className="text-[10px] text-[#334155]">Claudio v0.1.0</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-500 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-[#e2e8f0]">{label}</p>
        <p className="text-[10px] text-[#475569]">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors relative ${
          checked ? "bg-blue-600" : "bg-[#1e1e3a]"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
