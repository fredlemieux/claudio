import type { JSX } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import * as Icons from "../index";

const meta: Meta = {
  title: "Library/Icons",
  decorators: [
    (Story) => (
      <div style={{ background: "var(--color-base)", padding: "2rem", minHeight: "100vh" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj;

const allIcons = Object.entries(Icons).filter(
  ([, value]) => typeof value === "function"
) as [string, (props: { className?: string }) => JSX.Element][];

function IconGrid({ size, color }: { size: string; color: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "1rem" }}>
      {allIcons.map(([name, Icon]) => (
        <div
          key={name}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
            padding: "1rem",
            borderRadius: "0.5rem",
            border: "1px solid var(--color-border)",
            background: "var(--color-surface-1)",
          }}
        >
          <Icon className={`${size} ${color}`} />
          <span style={{ fontSize: "10px", color: "var(--color-text-secondary)", textAlign: "center" }}>
            {name.replace("Icon", "")}
          </span>
        </div>
      ))}
    </div>
  );
}

export const AllIcons: Story = {
  render: () => <IconGrid size="w-5 h-5" color="text-text-primary" />,
};

export const Small: Story = {
  render: () => <IconGrid size="w-3 h-3" color="text-text-primary" />,
};

export const Large: Story = {
  render: () => <IconGrid size="w-8 h-8" color="text-text-primary" />,
};

export const BlueAccent: Story = {
  render: () => <IconGrid size="w-5 h-5" color="text-blue-400" />,
};

export const StatusColors: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "2rem", padding: "1rem" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
        <Icons.IconCheckmark className="w-6 h-6 text-green-400" />
        <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>Success</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
        <Icons.IconXMark className="w-6 h-6 text-red-400" />
        <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>Error</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
        <Icons.IconSearch className="w-6 h-6 text-blue-400" />
        <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>Info</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
        <Icons.IconSparkle className="w-6 h-6 text-amber-400" />
        <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>Warning</span>
      </div>
    </div>
  ),
};

export const AgentTypes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "2rem", padding: "1rem" }}>
      {[
        { icon: Icons.IconCodeBrackets, label: "Engineer", color: "text-blue-400" },
        { icon: Icons.IconMagnifyingGlass, label: "Explore", color: "text-cyan-400" },
        { icon: Icons.IconBook, label: "Research", color: "text-purple-400" },
        { icon: Icons.IconGrid, label: "Architect", color: "text-amber-400" },
        { icon: Icons.IconSparkle, label: "General", color: "text-text-interactive" },
      ].map(({ icon: Icon, label, color }) => (
        <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
          <Icon className={`w-6 h-6 ${color}`} />
          <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>{label}</span>
        </div>
      ))}
    </div>
  ),
};
