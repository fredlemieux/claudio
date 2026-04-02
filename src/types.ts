export interface Skill {
  name: string;
  path: string;
  fullDescription: string;
  triggers: string[];
  tier: "always" | "deferred";
}

export interface SkillIndex {
  generated: string;
  version: string;
  totalSkills: number;
  skills: Record<string, Skill>;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}
