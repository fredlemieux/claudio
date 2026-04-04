import type { Meta, StoryObj } from "@storybook/react";
import { SkillPalette } from "../SkillPalette";
import { fn } from "@storybook/test";
import type { Skill } from "../../types";

const meta: Meta<typeof SkillPalette> = {
  title: "Components/SkillPalette",
  component: SkillPalette,
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", background: "#0a0a14" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SkillPalette>;

const sampleSkills: Skill[] = [
  { name: "Research", path: "Research/SKILL.md", fullDescription: "Comprehensive research, analysis, and content extraction", triggers: ["research", "investigate"], tier: "always" },
  { name: "Council", path: "Council/SKILL.md", fullDescription: "Multi-agent structured debate", triggers: ["council", "debate"], tier: "deferred" },
  { name: "Browser", path: "Browser/SKILL.md", fullDescription: "Debug-first browser automation", triggers: ["browser", "screenshot"], tier: "deferred" },
  { name: "Art", path: "Art/SKILL.md", fullDescription: "Complete visual content system", triggers: ["art", "image"], tier: "deferred" },
  { name: "JIRA", path: "_JIRA/SKILL.md", fullDescription: "Jira ticket access via REST API", triggers: ["jira", "ticket"], tier: "deferred" },
];

export const Open: Story = {
  args: {
    skills: sampleSkills,
    isOpen: true,
    onClose: fn(),
    onSelect: fn(),
  },
};

export const Closed: Story = {
  args: {
    skills: sampleSkills,
    isOpen: false,
    onClose: fn(),
    onSelect: fn(),
  },
};
