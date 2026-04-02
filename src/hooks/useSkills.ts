import { useState } from "react";
import type { Skill } from "../types";

// Skills are loaded from a curated list matching PAI's skill-index.json
// Future: read dynamically via Tauri fs plugin
const ALL_SKILLS: Skill[] = [
  { name: "Research", path: "Research/SKILL.md", fullDescription: "Comprehensive research, analysis, and content extraction", triggers: ["research", "investigate", "find information"], tier: "always" },
  { name: "Council", path: "Council/SKILL.md", fullDescription: "Multi-agent structured debate", triggers: ["council", "debate", "perspectives"], tier: "deferred" },
  { name: "RedTeam", path: "RedTeam/SKILL.md", fullDescription: "Adversarial analysis with 32 agents", triggers: ["red team", "attack", "critique"], tier: "deferred" },
  { name: "Browser", path: "Browser/SKILL.md", fullDescription: "Debug-first browser automation with visibility", triggers: ["browser", "screenshot", "debug web"], tier: "deferred" },
  { name: "Art", path: "Art/SKILL.md", fullDescription: "Complete visual content system", triggers: ["art", "image", "illustration", "diagram"], tier: "deferred" },
  { name: "FirstPrinciples", path: "FirstPrinciples/SKILL.md", fullDescription: "First principles decomposition to root causes", triggers: ["first principles", "root cause", "decompose"], tier: "deferred" },
  { name: "Evals", path: "Evals/SKILL.md", fullDescription: "Agent evaluation framework", triggers: ["eval", "evaluate", "benchmark"], tier: "deferred" },
  { name: "Science", path: "Science/SKILL.md", fullDescription: "Universal thinking engine based on scientific method", triggers: ["think about", "experiment", "iterate"], tier: "deferred" },
  { name: "BeCreative", path: "BeCreative/SKILL.md", fullDescription: "Extended thinking and creative ideation", triggers: ["be creative", "deep thinking"], tier: "deferred" },
  { name: "IterativeDepth", path: "IterativeDepth/SKILL.md", fullDescription: "Multi-angle iterative exploration", triggers: ["iterative depth", "deep exploration"], tier: "deferred" },
  { name: "Agents", path: "Agents/SKILL.md", fullDescription: "Dynamic agent composition and management", triggers: ["create agents", "custom agents"], tier: "deferred" },
  { name: "JIRA", path: "_JIRA/SKILL.md", fullDescription: "Jira ticket access via REST API", triggers: ["jira", "ticket", "sprint"], tier: "deferred" },
  { name: "Clockify", path: "_CLOCKIFY/SKILL.md", fullDescription: "Time tracking via Clockify API", triggers: ["clockify", "time tracking", "hours"], tier: "deferred" },
  { name: "Todoist", path: "Todoist/SKILL.md", fullDescription: "Todoist task management", triggers: ["todoist", "todo", "task"], tier: "deferred" },
  { name: "GoogleTasks", path: "_GOOGLETASKS/SKILL.md", fullDescription: "Google Tasks integration", triggers: ["google tasks", "my tasks"], tier: "deferred" },
  { name: "Worktree", path: "_WORKTREE/SKILL.md", fullDescription: "Git worktree manager with Jira integration", triggers: ["worktree", "branch"], tier: "deferred" },
  { name: "PR", path: "_PR/SKILL.md", fullDescription: "Generate PR descriptions with diff analysis", triggers: ["pr", "pull request"], tier: "deferred" },
  { name: "TechDebt", path: "_TECHDEBT/SKILL.md", fullDescription: "Create tech debt tickets without breaking flow", triggers: ["tech debt", "code smell"], tier: "deferred" },
  { name: "Standup", path: "_STANDUP/SKILL.md", fullDescription: "Morning standup prep from all sources", triggers: ["standup", "daily standup"], tier: "deferred" },
  { name: "Plan", path: "_PLAN/SKILL.md", fullDescription: "Forward work planning and priorities", triggers: ["plan", "priorities"], tier: "deferred" },
  { name: "WOP", path: "_WOP/SKILL.md", fullDescription: "Work in Progress sync from Jira/GitHub", triggers: ["wop", "work in progress"], tier: "deferred" },
  { name: "Fabric", path: "Fabric/SKILL.md", fullDescription: "240+ prompt patterns for content analysis", triggers: ["fabric", "pattern"], tier: "deferred" },
  { name: "ExtractWisdom", path: "ExtractWisdom/SKILL.md", fullDescription: "Dynamic wisdom extraction from content", triggers: ["extract wisdom", "key takeaways"], tier: "deferred" },
  { name: "Accountability", path: "Accountability/SKILL.md", fullDescription: "Track personal goals and habits", triggers: ["accountability", "check-in"], tier: "deferred" },
  { name: "CreateSkill", path: "CreateSkill/SKILL.md", fullDescription: "Create and validate new skills", triggers: ["create skill", "new skill"], tier: "deferred" },
  { name: "Cloudflare", path: "Cloudflare/SKILL.md", fullDescription: "Deploy Cloudflare Workers/Pages", triggers: ["cloudflare", "worker", "deploy"], tier: "deferred" },
  { name: "Remotion", path: "Remotion/SKILL.md", fullDescription: "Programmatic video creation with React", triggers: ["video", "animation", "remotion"], tier: "deferred" },
  { name: "OSINT", path: "OSINT/SKILL.md", fullDescription: "Open source intelligence gathering", triggers: ["osint", "due diligence"], tier: "deferred" },
  { name: "Recon", path: "Recon/SKILL.md", fullDescription: "Security reconnaissance", triggers: ["recon", "bug bounty"], tier: "deferred" },
  { name: "VoiceServer", path: "VoiceServer/SKILL.md", fullDescription: "Voice server management and TTS", triggers: ["voice", "mute", "unmute"], tier: "deferred" },
  { name: "Slim", path: "Slim/SKILL.md", fullDescription: "Toggle compact statusline mode", triggers: ["slim", "statusline"], tier: "deferred" },
  { name: "Telos", path: "Telos/SKILL.md", fullDescription: "Life OS and project analysis", triggers: ["telos", "life goals"], tier: "deferred" },
  { name: "WriteStory", path: "WriteStory/SKILL.md", fullDescription: "Layered fiction writing system", triggers: ["write story", "fiction", "novel"], tier: "deferred" },
  { name: "Prompting", path: "Prompting/SKILL.md", fullDescription: "Meta-prompting and template generation", triggers: ["prompting", "template"], tier: "deferred" },
  { name: "Documents", path: "Documents/SKILL.md", fullDescription: "Document processing", triggers: ["document", "process file"], tier: "deferred" },
  { name: "Parser", path: "Parser/SKILL.md", fullDescription: "Parse URLs, files, videos to JSON", triggers: ["parse", "extract", "transcript"], tier: "deferred" },
  { name: "Apify", path: "Apify/SKILL.md", fullDescription: "Social media scraping via Apify actors", triggers: ["scrape", "twitter", "linkedin"], tier: "deferred" },
  { name: "Sales", path: "Sales/SKILL.md", fullDescription: "Sales workflows and proposals", triggers: ["sales", "proposal", "pricing"], tier: "deferred" },
];

export function useSkills() {
  const [skills] = useState<Skill[]>(ALL_SKILLS);
  const [loading] = useState(false);

  return { skills, loading };
}

export function filterSkills(skills: Skill[], query: string): Skill[] {
  if (!query) return skills;
  const lower = query.toLowerCase();
  return skills.filter(
    (s) =>
      s.name.toLowerCase().includes(lower) ||
      s.fullDescription.toLowerCase().includes(lower) ||
      s.triggers.some((t) => t.toLowerCase().includes(lower))
  );
}
