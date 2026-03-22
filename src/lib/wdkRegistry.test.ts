import { describe, expect, it } from "vitest";
import {
  CHAIN_RUNTIME_CAPS,
  CHAIN_WALLET_REGISTRY,
  getTetherTransferSupport,
  WDK_PACKAGES,
} from "@/lib/wdkRegistry";

describe("wdkRegistry", () => {
  it("maps each supported chain to a wallet package name", () => {
    expect(CHAIN_WALLET_REGISTRY.ethereum.packageName).toBe(WDK_PACKAGES.walletEvm);
    expect(CHAIN_WALLET_REGISTRY.solana.packageName).toBe(WDK_PACKAGES.walletSolana);
    expect(CHAIN_WALLET_REGISTRY.tron.packageName).toBe(WDK_PACKAGES.walletTron);
    expect(CHAIN_WALLET_REGISTRY.ton.packageName).toBe(WDK_PACKAGES.walletTon);
  });

  it("allows Tether transfers only on EVM testnet paths in this build", () => {
    expect(getTetherTransferSupport("ethereum", "USDt").ok).toBe(true);
    const sol = getTetherTransferSupport("solana", "USDt");
    expect(sol.ok).toBe(false);
    if (!sol.ok) {
      const err = sol as { code: string; packageName: string };
      expect(err.code).toBe("CAPABILITY_UNSUPPORTED");
      expect(err.packageName).toBe(WDK_PACKAGES.walletSolana);
    }
  });

  it("exposes read paths for non-EVM chains while blocking writes", () => {
    expect(CHAIN_RUNTIME_CAPS.solana.tetherBalanceRead).toBe(true);
    expect(CHAIN_RUNTIME_CAPS.solana.writeTransferUsdT).toBe(false);
  });
});
