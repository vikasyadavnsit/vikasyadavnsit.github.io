import type { EnvConfig } from "./types";

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function evaluate(
  envConfig: EnvConfig | undefined,
  context: { userId?: string } = {}
): boolean {
  if (!envConfig?.enabled) return false;

  if (envConfig.strategy === "rollout") {
    const uid = context.userId ?? "anonymous";
    return simpleHash(uid) % 100 < (envConfig.rolloutPercentage ?? 50);
  }

  if (envConfig.strategy === "userlist") {
    const list = (envConfig.allowedUsers ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return list.includes(context.userId ?? "");
  }

  return true;
}

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
