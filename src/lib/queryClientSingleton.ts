import type { QueryClient } from "@tanstack/react-query";

let client: QueryClient | null = null;

export function setQueryClient(c: QueryClient | null): void {
  client = c;
}

export function getQueryClient(): QueryClient | null {
  return client;
}
