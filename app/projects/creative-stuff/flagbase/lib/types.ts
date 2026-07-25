export type StrategyType = "default" | "rollout" | "userlist";

export interface EnvConfig {
  enabled: boolean;
  strategy: StrategyType;
  rolloutPercentage: number;
  allowedUsers: string;
}

export interface FlagbaseProject {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  environments: string[];
}

export interface FlagbaseFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  type: "boolean";
  createdAt: number;
  environments: Record<string, EnvConfig>;
}

export interface FlagImpression {
  count: number;
  lastEval: number;
}

export type View = "landing" | "dashboard" | "project" | "flag-detail" | "docs";
