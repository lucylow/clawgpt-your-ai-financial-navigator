/**
 * Smoke script: register → wallet → agent message (portfolio).
 * Run with: `npm run demo:flow` from backend/ (requires DATABASE_URL, JWT_SECRET, BACKEND_ENCRYPTION_KEY_HEX).
 */
import "dotenv/config";
import { prisma } from "../src/lib/db.js";
import { WalletService } from "../src/services/wallet.service.js";
import { SafetyService } from "../src/services/safety.service.js";
import { AgentToolsService } from "../src/services/agent-tools.service.js";
import { AgentOrchestrator } from "../src/services/agent-orchestrator.service.js";
import { AuthService } from "../src/services/auth.service.js";

async function main() {
  const walletService = new WalletService(prisma);
  const safety = new SafetyService(prisma);
  const tools = new AgentToolsService({ walletService, safetyService: safety, db: prisma });
  const orchestrator = new AgentOrchestrator(prisma, walletService, tools);
  const auth = new AuthService(prisma);

  const email = `demo_${Date.now()}@example.com`;
  const password = "demo-password-12345";
  const { token, userId } = await auth.register({ email, password });
  console.log("Registered demo user:", email, "token (trunc):", token.slice(0, 12) + "…");

  const w = await walletService.createWallet(userId);
  console.log("Wallet:", w.walletId);
  console.log("Fund testnet addresses from mnemonic on Sepolia/Amoy as needed.");

  const r = await orchestrator.handleMessage(userId, "show my portfolio");
  console.log("Agent:", JSON.stringify(r, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
