import type { Meta, StoryObj } from "@storybook/react";
import { SlashAutocomplete } from "../SlashAutocomplete";
import { fn } from "@storybook/test";
import type { Skill } from "../../types";

const meta: Meta<typeof SlashAutocomplete> = {
  title: "Components/SlashAutocomplete",
  component: SlashAutocomplete,
  decorators: [
    (Story) => (
      <div style={{ position: "relative", height: 300, background: "var(--color-base)", padding: 20 }}>
        <div style={{ position: "absolute", bottom: 20, left: 20, right: 20 }}>
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SlashAutocomplete>;

const matchedSkills: Skill[] = [
  { name: "Research", path: "Research/SKILL.md", fullDescription: "Comprehensive research", triggers: ["research"], tier: "always" },
  { name: "Recon", path: "Recon/SKILL.md", fullDescription: "Security reconnaissance", triggers: ["recon"], tier: "deferred" },
  { name: "RedTeam", path: "RedTeam/SKILL.md", fullDescription: "Adversarial analysis", triggers: ["red team"], tier: "deferred" },
  { name: "Remotion", path: "Remotion/SKILL.md", fullDescription: "Video creation", triggers: ["remotion"], tier: "deferred" },
];

export const Visible: Story = {
  args: {
    skills: matchedSkills,
    selectedIndex: 0,
    onSelect: fn(),
    visible: true,
  },
};

export const SecondSelected: Story = {
  args: {
    skills: matchedSkills,
    selectedIndex: 1,
    onSelect: fn(),
    visible: true,
  },
};

export const Hidden: Story = {
  args: {
    skills: matchedSkills,
    selectedIndex: 0,
    onSelect: fn(),
    visible: false,
  },
};
