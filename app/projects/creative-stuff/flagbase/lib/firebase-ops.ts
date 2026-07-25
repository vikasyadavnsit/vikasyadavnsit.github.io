import { db } from "@/lib/firebase";
import {
  ref, push, set, get, update, onValue, off, remove, runTransaction,
} from "firebase/database";
import type { FlagbaseProject, FlagbaseFlag, EnvConfig, FlagImpression, StrategyType } from "./types";

// Separate paths keep project listing lightweight (no flags in the scan)
const PROJECTS = "flagbase/projects";
const FLAGS     = "flagbase/flags";
const IMPRESSIONS = "flagbase/impressions";

// ── Projects ──────────────────────────────────────────────────────────────

export const createProject = async (
  data: Omit<FlagbaseProject, "id">
): Promise<string> => {
  const newRef = push(ref(db, PROJECTS));
  const id = newRef.key!;
  await set(newRef, { ...data, id });
  return id;
};

export const deleteProject = async (id: string): Promise<void> => {
  await Promise.all([
    remove(ref(db, `${PROJECTS}/${id}`)),
    remove(ref(db, `${FLAGS}/${id}`)),
    remove(ref(db, `${IMPRESSIONS}/${id}`)),
  ]);
};

export const subscribeToProjects = (
  cb: (projects: FlagbaseProject[]) => void
): (() => void) => {
  const r = ref(db, PROJECTS);
  const listener = onValue(r, (snap) => {
    const data = snap.val();
    if (data) {
      const list = Object.values(data) as FlagbaseProject[];
      list.sort((a, b) => b.createdAt - a.createdAt);
      cb(list);
    } else {
      cb([]);
    }
  });
  return () => off(r, "value", listener);
};

export const subscribeToProject = (
  projectId: string,
  cb: (project: FlagbaseProject | null) => void
): (() => void) => {
  const r = ref(db, `${PROJECTS}/${projectId}`);
  const listener = onValue(r, (snap) => {
    cb(snap.exists() ? (snap.val() as FlagbaseProject) : null);
  });
  return () => off(r, "value", listener);
};

// ── Flags ──────────────────────────────────────────────────────────────────

export const createFlag = async (
  projectId: string,
  data: Omit<FlagbaseFlag, "id">
): Promise<string> => {
  const newRef = push(ref(db, `${FLAGS}/${projectId}`));
  const id = newRef.key!;
  await set(newRef, { ...data, id });
  return id;
};

export const deleteFlag = async (
  projectId: string,
  flagId: string
): Promise<void> => {
  await Promise.all([
    remove(ref(db, `${FLAGS}/${projectId}/${flagId}`)),
    remove(ref(db, `${IMPRESSIONS}/${projectId}/${flagId}`)),
  ]);
};

export const subscribeToFlags = (
  projectId: string,
  cb: (flags: FlagbaseFlag[]) => void
): (() => void) => {
  const r = ref(db, `${FLAGS}/${projectId}`);
  const listener = onValue(r, (snap) => {
    const data = snap.val();
    if (data) {
      const list = Object.values(data) as FlagbaseFlag[];
      list.sort((a, b) => a.createdAt - b.createdAt);
      cb(list);
    } else {
      cb([]);
    }
  });
  return () => off(r, "value", listener);
};

export const updateEnvConfig = async (
  projectId: string,
  flagId: string,
  env: string,
  config: Partial<EnvConfig>
): Promise<void> => {
  const envRef = ref(db, `${FLAGS}/${projectId}/${flagId}/environments/${env}`);
  const snap = await get(envRef);
  if (!snap.exists()) {
    await set(envRef, {
      enabled: false,
      strategy: "default" as StrategyType,
      rolloutPercentage: 50,
      allowedUsers: "",
      ...config,
    });
  } else {
    await update(envRef, config);
  }
};

// ── Impressions ────────────────────────────────────────────────────────────

export const recordImpression = async (
  projectId: string,
  flagId: string,
  env: string
): Promise<void> => {
  const countRef = ref(db, `${IMPRESSIONS}/${projectId}/${flagId}/${env}/count`);
  await runTransaction(countRef, (cur) => (cur ?? 0) + 1);
  await set(
    ref(db, `${IMPRESSIONS}/${projectId}/${flagId}/${env}/lastEval`),
    Date.now()
  );
};

export const subscribeToImpressions = (
  projectId: string,
  flagId: string,
  cb: (impressions: Record<string, FlagImpression>) => void
): (() => void) => {
  const r = ref(db, `${IMPRESSIONS}/${projectId}/${flagId}`);
  const listener = onValue(r, (snap) => {
    cb((snap.val() as Record<string, FlagImpression>) ?? {});
  });
  return () => off(r, "value", listener);
};
