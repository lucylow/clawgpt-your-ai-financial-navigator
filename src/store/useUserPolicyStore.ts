import { create } from "zustand";
import {
  defaultUserPolicy,
  parseUserPolicyJson,
  stringifyUserPolicy,
  type UserPolicyV1,
} from "@/lib/sovereignty/userPolicy";

const STORAGE_KEY = "clawgpt_user_policy_v1";

function load(): UserPolicyV1 {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return defaultUserPolicy();
    const p = parseUserPolicyJson(raw);
    return p.ok ? p.policy : defaultUserPolicy();
  } catch {
    return defaultUserPolicy();
  }
}

function save(policy: UserPolicyV1): void {
  try {
    localStorage.setItem(STORAGE_KEY, stringifyUserPolicy(policy));
  } catch {
    /* quota / private mode */
  }
}

interface UserPolicyState {
  policy: UserPolicyV1;
  setPolicy: (next: UserPolicyV1) => void;
  patchPolicy: (partial: Partial<Omit<UserPolicyV1, "v" | "updatedAtMs">>) => void;
  resetPolicy: () => void;
  importFromJson: (raw: string) => { ok: true } | { ok: false; error: string };
  exportJson: () => string;
}

export const useUserPolicyStore = create<UserPolicyState>((set, get) => ({
  policy: typeof window !== "undefined" ? load() : defaultUserPolicy(),

  setPolicy: (next) => {
    const withTs = { ...next, updatedAtMs: Date.now() };
    save(withTs);
    set({ policy: withTs });
  },

  patchPolicy: (partial) => {
    const cur = get().policy;
    const next: UserPolicyV1 = {
      ...cur,
      ...partial,
      updatedAtMs: Date.now(),
    };
    save(next);
    set({ policy: next });
  },

  resetPolicy: () => {
    const d = defaultUserPolicy();
    save(d);
    set({ policy: d });
  },

  importFromJson: (raw) => {
    const p = parseUserPolicyJson(raw);
    if (!p.ok) return p;
    const withTs = { ...p.policy, updatedAtMs: Date.now() };
    save(withTs);
    set({ policy: withTs });
    return { ok: true };
  },

  exportJson: () => stringifyUserPolicy(get().policy),
}));
