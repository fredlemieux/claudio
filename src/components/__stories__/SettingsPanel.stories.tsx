import type { Meta, StoryObj } from "@storybook/react";
import { SettingsPanel } from "../SettingsPanel";
import { fn } from "@storybook/test";

const meta: Meta<typeof SettingsPanel> = {
  title: "Components/SettingsPanel",
  component: SettingsPanel,
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", background: "#0a0a14" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SettingsPanel>;

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: fn(),
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: fn(),
  },
};
