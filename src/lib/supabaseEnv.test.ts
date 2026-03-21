import { describe, it, expect } from "vitest";
import { supabaseEdgeFunctionHeaders } from "@/lib/supabaseEnv";

describe("supabaseEnv edge helpers", () => {
  it("supabaseEdgeFunctionHeaders matches Supabase invoke auth shape", () => {
    const k = "test-anon-key";
    expect(supabaseEdgeFunctionHeaders(k)).toEqual({
      Authorization: `Bearer ${k}`,
      apikey: k,
    });
  });
});
