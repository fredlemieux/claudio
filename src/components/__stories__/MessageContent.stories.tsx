import type { Meta, StoryObj } from "@storybook/react";
import { MessageContent } from "../MessageContent";

const meta: Meta<typeof MessageContent> = {
  title: "Components/MessageContent",
  component: MessageContent,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 600, padding: 20, background: "#16162a", borderRadius: 16 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MessageContent>;

export const UserMessage: Story = {
  args: {
    content: "How do I set up a new React project?",
    role: "user",
  },
};

export const AssistantPlainText: Story = {
  args: {
    content: "Here's a quick overview of how to set up a React project.",
    role: "assistant",
  },
};

export const AssistantMarkdown: Story = {
  args: {
    content: `# Getting Started with React

Here's how to create a new project:

1. Install **Node.js** (v18+)
2. Run the create command
3. Start developing!

## Using Vite

\`\`\`bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm run dev
\`\`\`

> **Note:** Vite is much faster than Create React App for development.

Check the [official docs](https://react.dev) for more details.`,
    role: "assistant",
  },
};

export const AssistantCodeBlock: Story = {
  args: {
    content: `Here's a simple component:

\`\`\`tsx
import { useState } from "react";

interface CounterProps {
  initialValue?: number;
}

export function Counter({ initialValue = 0 }: CounterProps) {
  const [count, setCount] = useState(initialValue);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </div>
  );
}
\`\`\`

Use it like \`<Counter initialValue={5} />\`.`,
    role: "assistant",
  },
};

export const AssistantTable: Story = {
  args: {
    content: `Here's a comparison:

| Feature | Vite | Webpack |
|---------|------|---------|
| Dev startup | <300ms | 2-10s |
| HMR | Instant | 1-3s |
| Build | Fast | Moderate |
| Config | Minimal | Complex |`,
    role: "assistant",
  },
};

export const EmptyAssistant: Story = {
  args: {
    content: "",
    role: "assistant",
  },
};
