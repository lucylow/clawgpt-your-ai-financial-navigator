/**
 * Pure WDK wrapper: wallet creation, encrypted key storage, balances, transfers.
 * Controllers must not import WDK directly — use this service.
 */

import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import type { PrismaClient } from "@prisma/client";
import { decryptUtf8, encryptUtf8, parseVault, serializeVault } from "../lib/cryptoVault.js";
import type { AgentChainId, MultiChainBalances, TetherAssetSymbol } from "../lib/constants.js";
import { SUPPORTED_CHAINS, TETHER_DECIMALS } from "../lib/constants.js";
import { createWdkFromMnemonic } from "../config/wdk.js";
import {
  chainSupportsEvmTransfer,
  getEvmTokenAddresses,
  getSolanaMints,
  getTonJettonMasters,
  getTronTokenAddresses,
} from "../config/chainsEnv.js";
import { z } from "zod";
import { AppError } from "../lib/appError.js";

type EvmAccount = {
  getAddress: () => Promise<string>;
  getTokenBalances: (tokens: string[]) => Promise<unknown>;
  transfer: (o: { token: string; recipient: string; amount: bigint }) => Promise<{ hash: string }>;
};

function fromTetherRawUnits(n: bigint, decimals: number): string {
  return (Number(n) / 10 ** decimals).toFixed(6);
}

function parseAmountToRaw(amount: string, decimals: number): bigint {
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid amount");
  return BigInt(Math.round(n * 10 ** decimals));
}

function evmBalancesTriple(raw: unknown, len: number): [bigint, bigint, bigint] {
  if (Array.isArray(raw)) {
    const a = len > 0 ? BigInt(raw[0] as bigint | number | string) : 0n;
    const b = len > 1 ? BigInt(raw[1] as bigint | number | string) : 0n;
    const c = len > 2 ? BigInt(raw[2] as bigint | number | string) : 0n;
    return [a, b, c];
  }
  if (raw && typeof raw === "object") {
    const vals = Object.values(raw as Record<string, bigint>);
    return [vals[0] ?? 0n, vals[1] ?? 0n, vals[2] ?? 0n];
  }
  return [0n, 0n, 0n];
}

const sendTokenParamsSchema = z.object({
  userId: z.string(),
  walletId: z.string(),
  chain: z.enum(SUPPORTED_CHAINS as unknown as [AgentChainId, ...AgentChainId[]]),
  asset: z.enum(["USDT", "USAT", "XAUT"]),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  toAddress: z.string().min(8),
});

export type SendTokenParams = z.infer<typeof sendTokenParamsSchema>;

export class WalletService {
  constructor(private readonly db: PrismaClient) {}

  async createWallet(userId: string): Promise<{
    walletId: string;
    mnemonic: string;
    addresses: Record<AgentChainId, string>;
  }> {
    const mnemonic = generateMnemonic(wordlist, 256);
    const wdk = createWdkFromMnemonic(mnemonic);
    try {
      const addresses = {} as Record<AgentChainId, string>;
      for (const chain of SUPPORTED_CHAINS) {
        const acc = await wdk.getAccount(chain, 0);
        addresses[chain] = await acc.getAddress();
      }
      const enc = encryptUtf8(mnemonic);
      const wallet = await this.db.wallet.create({
        data: {
          userId,
          encPayload: serializeVault(enc),
          addresses: addresses as object,
        },
      });
      return { walletId: wallet.id, mnemonic, addresses };
    } finally {
      try {
        wdk.dispose();
      } catch {
        /* ignore */
      }
    }
  }

  async listWallets(userId: string) {
    return this.db.wallet.findMany({
      where: { userId },
      select: { id: true, label: true, addresses: true, createdAt: true },
    });
  }

  private async loadMnemonicForUserWallet(userId: string, walletId: string): Promise<string> {
    const w = await this.db.wallet.findFirst({ where: { id: walletId, userId } });
    if (!w) throw new Error("Wallet not found");
    const blob = parseVault(w.encPayload);
    return decryptUtf8(blob);
  }

  async getBalances(userId: string, walletId: string): Promise<MultiChainBalances> {
    const mnemonic = await this.loadMnemonicForUserWallet(userId, walletId);
    const wdk = createWdkFromMnemonic(mnemonic);
    const out = {} as MultiChainBalances;
    try {
      for (const chain of SUPPORTED_CHAINS) {
        out[chain] = await this.fetchChainBalances(wdk, chain);
      }
      return out;
    } finally {
      try {
        wdk.dispose();
      } catch {
        /* ignore */
      }
    }
  }

  private async fetchChainBalances(wdk: ReturnType<typeof createWdkFromMnemonic>, chain: AgentChainId) {
    const empty = (): { USDT: string; USAT?: string; XAUT?: string } => ({
      USDT: "0.000000",
      USAT: "0.000000",
      XAUT: "0.000000",
    });

    if (chain === "ethereum" || chain === "polygon" || chain === "arbitrum") {
      const tokens = getEvmTokenAddresses(chain);
      const entries: { sym: "USDT" | "USAT" | "XAUT"; addr: string }[] = [];
      if (tokens.USDT?.startsWith("0x") && tokens.USDT.length === 42)
        entries.push({ sym: "USDT", addr: tokens.USDT });
      if (tokens.USAT?.startsWith("0x") && tokens.USAT.length === 42)
        entries.push({ sym: "USAT", addr: tokens.USAT });
      if (tokens.XAUT?.startsWith("0x") && tokens.XAUT.length === 42)
        entries.push({ sym: "XAUT", addr: tokens.XAUT });
      const acc = (await wdk.getAccount(chain, 0)) as unknown as EvmAccount;
      if (entries.length === 0) return empty();
      try {
        const addrs = entries.map((e) => e.addr);
        const raw = await acc.getTokenBalances(addrs);
        const triple = evmBalancesTriple(raw, addrs.length);
        const row: { USDT: string; USAT?: string; XAUT?: string } = { USDT: "0.000000" };
        for (let i = 0; i < entries.length; i++) {
          const sym = entries[i].sym;
          const dec = TETHER_DECIMALS[sym];
          const v = fromTetherRawUnits(triple[i] ?? 0n, dec);
          if (sym === "USDT") row.USDT = v;
          if (sym === "USAT") row.USAT = v;
          if (sym === "XAUT") row.XAUT = v;
        }
        return row;
      } catch {
        return empty();
      }
    }

    if (chain === "solana") {
      const mints = getSolanaMints();
      const acc = await wdk.getAccount(chain, 0);
      const anyAcc = acc as unknown as { getTokenBalance?: (m: string) => Promise<bigint> };
      const row: { USDT: string; USAT?: string; XAUT?: string } = { USDT: "0.000000" };
      try {
        if (mints.USDT && anyAcc.getTokenBalance)
          row.USDT = fromTetherRawUnits(await anyAcc.getTokenBalance(mints.USDT), TETHER_DECIMALS.USDT);
      } catch {
        row.USDT = "0.000000";
      }
      try {
        if (mints.USAT && anyAcc.getTokenBalance)
          row.USAT = fromTetherRawUnits(await anyAcc.getTokenBalance(mints.USAT), TETHER_DECIMALS.USAT);
      } catch {
        row.USAT = "0.000000";
      }
      try {
        if (mints.XAUT && anyAcc.getTokenBalance)
          row.XAUT = fromTetherRawUnits(await anyAcc.getTokenBalance(mints.XAUT), TETHER_DECIMALS.XAUT);
      } catch {
        row.XAUT = "0.000000";
      }
      return row;
    }

    if (chain === "tron") {
      const t = getTronTokenAddresses();
      const acc = await wdk.getAccount(chain, 0);
      const anyAcc = acc as unknown as { getTokenBalance?: (m: string) => Promise<bigint> };
      const row: { USDT: string; USAT?: string; XAUT?: string } = { USDT: "0.000000" };
      try {
        if (t.USDT && anyAcc.getTokenBalance)
          row.USDT = fromTetherRawUnits(await anyAcc.getTokenBalance(t.USDT), TETHER_DECIMALS.USDT);
      } catch {
        row.USDT = "0.000000";
      }
      try {
        if (t.USAT && anyAcc.getTokenBalance)
          row.USAT = fromTetherRawUnits(await anyAcc.getTokenBalance(t.USAT), TETHER_DECIMALS.USAT);
      } catch {
        row.USAT = "0.000000";
      }
      try {
        if (t.XAUT && anyAcc.getTokenBalance)
          row.XAUT = fromTetherRawUnits(await anyAcc.getTokenBalance(t.XAUT), TETHER_DECIMALS.XAUT);
      } catch {
        row.XAUT = "0.000000";
      }
      return row;
    }

    const jet = getTonJettonMasters();
    const acc = await wdk.getAccount(chain, 0);
    const anyAcc = acc as unknown as { getTokenBalance?: (m: string) => Promise<bigint> };
    const row: { USDT: string; USAT?: string; XAUT?: string } = { USDT: "0.000000" };
    try {
      if (jet.USDT && anyAcc.getTokenBalance)
        row.USDT = fromTetherRawUnits(await anyAcc.getTokenBalance(jet.USDT), TETHER_DECIMALS.USDT);
    } catch {
      row.USDT = "0.000000";
    }
    try {
      if (jet.USAT && anyAcc.getTokenBalance)
        row.USAT = fromTetherRawUnits(await anyAcc.getTokenBalance(jet.USAT), TETHER_DECIMALS.USAT);
    } catch {
      row.USAT = "0.000000";
    }
    try {
      if (jet.XAUT && anyAcc.getTokenBalance)
        row.XAUT = fromTetherRawUnits(await anyAcc.getTokenBalance(jet.XAUT), TETHER_DECIMALS.XAUT);
    } catch {
      row.XAUT = "0.000000";
    }
    return row;
  }

  async sendToken(params: SendTokenParams): Promise<{
    txHash: string;
    chain: AgentChainId;
    asset: TetherAssetSymbol;
    gasUsed?: string;
    status: "pending" | "confirmed";
  }> {
    const p = sendTokenParamsSchema.parse(params);
    if (!chainSupportsEvmTransfer(p.chain)) {
      throw new AppError(
        `Tether ${p.asset} transfer is not wired for ${p.chain} in this build — use an EVM testnet.`,
        "CHAIN_UNSUPPORTED",
        400,
      );
    }
    const mnemonic = await this.loadMnemonicForUserWallet(p.userId, p.walletId);
    const wdk = createWdkFromMnemonic(mnemonic);
    try {
      const tokens = getEvmTokenAddresses(p.chain as "ethereum" | "polygon" | "arbitrum");
      const token =
        p.asset === "USDT" ? tokens.USDT : p.asset === "USAT" ? tokens.USAT : tokens.XAUT;
      if (!token || !token.startsWith("0x")) {
        throw new AppError(
          `Set token env addresses for ${p.chain} ${p.asset} (see .env.example).`,
          "TOKEN_NOT_CONFIGURED",
          400,
        );
      }
      const acc = (await wdk.getAccount(p.chain, 0)) as unknown as EvmAccount;
      const amt = parseAmountToRaw(p.amount, TETHER_DECIMALS[p.asset]);
      try {
        const res = await acc.transfer({ token, recipient: p.toAddress, amount: amt });
        return {
          txHash: res.hash,
          chain: p.chain,
          asset: p.asset,
          status: "pending",
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const lower = msg.toLowerCase();
        if (lower.includes("insufficient funds") || lower.includes("insufficient balance")) {
          throw new AppError(
            "Insufficient funds for gas or token balance.",
            "INSUFFICIENT_FUNDS",
            400,
            true,
            "Fund the wallet on the target testnet (faucet) and retry.",
          );
        }
        if (lower.includes("gas") || lower.includes("underpriced")) {
          throw new AppError(msg, "GAS_ERROR", 400, true, "Retry with higher gas or check RPC.");
        }
        if (lower.includes("nonce")) {
          throw new AppError(msg, "NONCE_ERROR", 409, true);
        }
        throw new AppError(msg, "WDK_TRANSFER_FAILED", 502, true);
      }
    } finally {
      try {
        wdk.dispose();
      } catch {
        /* ignore */
      }
    }
  }

  /**
   * Bridge + batch DeFi steps are orchestrated as explicit sub-calls from agent-tools.
   * Generic bridge placeholder until a specific bridge module is registered in WDK.
   */
  async bridgeTokens(_input: {
    userId: string;
    walletId: string;
    fromChain: AgentChainId;
    toChain: AgentChainId;
    asset: TetherAssetSymbol;
    amount: string;
  }): Promise<{ status: "simulated" | "failed"; detail: string; txHash?: string }> {
    return {
      status: "simulated",
      detail:
        "Bridge execution requires a registered bridge provider in WDK; plan step recorded for audit. Use EVM-native flows for demo.",
    };
  }
}
