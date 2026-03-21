import { create } from "zustand";
import type { WdkChainId } from "@/config/chains";
import { SUPPORTED_WDK_CHAINS } from "@/config/chains";

const SESSION_KEY = "cockpit_focus_chain";

function readInitial(): WdkChainId {
  try {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(SESSION_KEY) : null;
    if (raw && (SUPPORTED_WDK_CHAINS as readonly string[]).includes(raw)) {
      return raw as WdkChainId;
    }
  } catch {
    /* ignore */
  }
  return "ethereum";
}

interface CockpitChainState {
  /** User-selected chain for cockpit context (transfers, labels, header). */
  focusChain: WdkChainId;
  setFocusChain: (chain: WdkChainId) => void;
}

export const useCockpitChainStore = create<CockpitChainState>((set) => ({
  focusChain: readInitial(),
  setFocusChain: (chain) => {
    try {
      sessionStorage.setItem(SESSION_KEY, chain);
    } catch {
      /* ignore */
    }
    set({ focusChain: chain });
  },
}));
