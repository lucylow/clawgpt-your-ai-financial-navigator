/**
 * Best-effort testnet faucet pings. Networks vary; failures are non-fatal.
 */
export async function requestFaucetTokens(address: string): Promise<void> {
  const urls = [
    `https://faucet.pimlico.io/api/v1/sepolia/fund?address=${encodeURIComponent(address)}`,
    `https://candide.dev/faucet/api?address=${encodeURIComponent(address)}`,
  ];
  await Promise.allSettled(urls.map((url) => fetch(url, { method: "GET", mode: "cors" })));
}

export function waitForFunding(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
