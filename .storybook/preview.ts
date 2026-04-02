import type { Preview } from "@storybook/react";
import "../src/App.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "claudio-dark",
      values: [
        { name: "claudio-dark", value: "#0a0a14" },
        { name: "claudio-card", value: "#16162a" },
      ],
    },
  },
};

export default preview;
