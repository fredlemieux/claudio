import { useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { InputBar } from "../InputBar";
import { fn } from "@storybook/test";
import type { Skill } from "../../types";

const meta: Meta<typeof InputBar> = {
  title: "Sections/InputBar",
  component: InputBar,
  decorators: [
    (Story) => (
      <div style={{ background: "#0a0a14", paddingTop: 300 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof InputBar>;

const sampleSkills: Skill[] = [
  { name: "Research", path: "Research/SKILL.md", fullDescription: "Comprehensive research", triggers: ["research"], tier: "always" },
  { name: "Browser", path: "Browser/SKILL.md", fullDescription: "Browser automation", triggers: ["browser"], tier: "deferred" },
  { name: "Council", path: "Council/SKILL.md", fullDescription: "Multi-agent debate", triggers: ["council"], tier: "deferred" },
];

const InteractiveInputBar = () => {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  return (
    <InputBar
      skills={sampleSkills}
      isStreaming={false}
      sidebarOpen={false}
      drawerOpen={false}
      onSend={fn()}
      onStop={fn()}
      input={input}
      onInputChange={setInput}
      inputRef={inputRef}
    />
  );
};

export const Default: Story = {
  render: () => <InteractiveInputBar />,
};

const StreamingInputBar = () => {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  return (
    <InputBar
      skills={sampleSkills}
      isStreaming={true}
      sidebarOpen={false}
      drawerOpen={false}
      onSend={fn()}
      onStop={fn()}
      input={input}
      onInputChange={setInput}
      inputRef={inputRef}
    />
  );
};

export const WhileStreaming: Story = {
  render: () => <StreamingInputBar />,
};

const SlashInputBar = () => {
  const [input, setInput] = useState("/re");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  return (
    <InputBar
      skills={sampleSkills}
      isStreaming={false}
      sidebarOpen={false}
      drawerOpen={false}
      onSend={fn()}
      onStop={fn()}
      input={input}
      onInputChange={setInput}
      inputRef={inputRef}
    />
  );
};

export const WithSlashAutocomplete: Story = {
  render: () => <SlashInputBar />,
};
