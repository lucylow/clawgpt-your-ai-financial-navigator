import { runAgentPipeline } from "./agentPipeline.ts";
import { backendErrorResponse } from "./errors.ts";
import { mergeToolEvents } from "./events.ts";
import { structuredLog } from "./logging.ts";
import { agentChatRequestSchema } from "./schemas.ts";
import { buildSystemPrompt } from "./systemPrompt.ts";
import { tools } from "./toolDefinitions.ts";
import { executeTool } from "./toolExecutor.ts";
import type { ToolCall, ToolExecuteResult } from "./types.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-correlation-id, x-idempotency-key",
};

const SYSTEM_PROMPT = buildSystemPrompt();

function prependSseMetadata(
  upstream: ReadableStream<Uint8Array> | null,
  metadata: Record<string, unknown>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const prefix = encoder.encode(`data: ${JSON.stringify({ metadata })}\n\n`);
  if (!upstream) {
    return new ReadableStream({
      start(c) {
        c.enqueue(prefix);
        c.close();
      },
    });
  }
  return new ReadableStream({
    async start(controller) {
      controller.enqueue(prefix);
      const reader = upstream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } finally {
        try {
          reader.releaseLock();
        } catch {
          /* ignore */
        }
        controller.close();
      }
    },
  });
}

function newCorrelationId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `corr_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

export async function handleAgentChatRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationIdHeader = req.headers.get("x-correlation-id")?.trim();
  let correlationId = correlationIdHeader && correlationIdHeader.length > 0 ? correlationIdHeader : newCorrelationId();

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      structuredLog("error", "missing_lovable_api_key", { correlationId });
      const body = backendErrorResponse({
        code: "CONFIG_MISSING",
        message: "AI gateway is not configured.",
        category: "INTERNAL_ERROR",
        recoverable: false,
        correlationId,
        debug: "LOVABLE_API_KEY",
      });
      return new Response(JSON.stringify(body), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Correlation-Id": correlationId },
      });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = agentChatRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const body = backendErrorResponse({
        code: "VALIDATION_ERROR",
        message: "Invalid request body.",
        category: "VALIDATION_ERROR",
        recoverable: true,
        correlationId,
        details: { fields: first },
      });
      return new Response(JSON.stringify(body), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Correlation-Id": correlationId },
      });
    }

    const { message, history, correlationId: bodyCorr, idempotencyKey, sessionMemory } = parsed.data;
    if (bodyCorr) correlationId = bodyCorr;

    structuredLog("info", "agent_chat_request", {
      correlationId,
      messageLen: message.length,
      historyLen: history.length,
      idempotencyKey: idempotencyKey ?? null,
      hasSessionMemory: Boolean(sessionMemory),
    });

    const content = message.trim();
    const conversationHistory: Array<{ role: string; content: string }> = history;

    const pipeline = runAgentPipeline(content, conversationHistory, correlationId, sessionMemory);
    structuredLog("info", "agent_pipeline", { correlationId, ...pipeline.telemetry });

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: pipeline.systemInjection },
      ...conversationHistory.slice(-20),
      { role: "user", content },
    ];

    const baseMetadata = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
      agentContract: pipeline.contract,
      events: pipeline.pipelineEvents,
      correlationId,
      ...extra,
    });

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        const body = backendErrorResponse({
          code: "RATE_LIMIT",
          message: "Rate limit exceeded. Please try again in a moment.",
          category: "RATE_LIMIT",
          recoverable: true,
          correlationId,
        });
        return new Response(JSON.stringify({ ...body, text: body.message, error: true }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "X-Correlation-Id": correlationId },
        });
      }
      if (aiResponse.status === 402) {
        const body = backendErrorResponse({
          code: "PAYMENT_REQUIRED",
          message: "AI credits exhausted. Please add funds in Settings → Workspace → Usage.",
          category: "PAYMENT_REQUIRED",
          recoverable: true,
          correlationId,
        });
        return new Response(JSON.stringify({ ...body, text: body.message, error: true }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json", "X-Correlation-Id": correlationId },
        });
      }
      const errText = await aiResponse.text();
      structuredLog("error", "ai_gateway_error", { correlationId, status: aiResponse.status });
      console.error("AI gateway error:", aiResponse.status, errText.slice(0, 500));
      const body = backendErrorResponse({
        code: "AI_GATEWAY_ERROR",
        message: "AI gateway error. Please try again.",
        category: "INTERNAL_ERROR",
        recoverable: true,
        correlationId,
      });
      return new Response(JSON.stringify({ ...body, text: body.message, error: true }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Correlation-Id": correlationId },
      });
    }

    let aiData: { choices?: Array<{ finish_reason?: string; message?: { tool_calls?: ToolCall[]; content?: string } }> };
    try {
      aiData = await aiResponse.json();
    } catch (e) {
      structuredLog("error", "ai_response_json_parse_failed", { correlationId });
      const body = backendErrorResponse({
        code: "BAD_GATEWAY",
        message: "Invalid response from AI gateway. Please try again.",
        category: "INTERNAL_ERROR",
        recoverable: true,
        correlationId,
        debug: e instanceof Error ? e.message : String(e),
      });
      return new Response(JSON.stringify({ ...body, text: body.message, error: true }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Correlation-Id": correlationId },
      });
    }
    const choice = aiData.choices?.[0];

    if (choice?.finish_reason === "tool_calls" || choice?.message?.tool_calls?.length) {
      if (!choice?.message) {
        const body = backendErrorResponse({
          code: "INCOMPLETE_TOOL_RESPONSE",
          message: "Incomplete tool response from AI. Please try again.",
          category: "INTERNAL_ERROR",
          recoverable: true,
          correlationId,
        });
        return new Response(JSON.stringify({ ...body, text: body.message, error: true }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json", "X-Correlation-Id": correlationId },
        });
      }
      const toolCalls = choice.message.tool_calls ?? [];
      const toolResults: ToolExecuteResult[] = [];

      for (const tc of toolCalls) {
        try {
          let args: Record<string, unknown>;
          if (typeof tc.function.arguments === "string") {
            try {
              args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
            } catch (parseErr) {
              structuredLog("warn", "tool_args_json_parse_error", {
                correlationId,
                tool: tc.function.name,
              });
              console.error("Tool arguments JSON parse error:", tc.function.name, parseErr);
              toolResults.push({
                text: `Invalid JSON for tool ${tc.function.name}.`,
              });
              continue;
            }
          } else {
            args = (tc.function.arguments ?? {}) as Record<string, unknown>;
          }
          const result = executeTool(tc.function.name, args, pipeline.contract);
          toolResults.push(result);
        } catch (e) {
          structuredLog("error", "execute_tool_error", {
            correlationId,
            tool: tc?.function?.name,
            err: e instanceof Error ? e.message : String(e),
          });
          console.error("executeTool error:", tc?.function?.name, e);
          toolResults.push({
            text: `Tool error (${tc?.function?.name ?? "?"}): ${e instanceof Error ? e.message : String(e)}`,
          });
        }
      }

      const toolEvents = mergeToolEvents(toolCalls, toolResults, correlationId);
      const allEvents = [...pipeline.pipelineEvents, ...toolEvents];

      const toolMessages = toolCalls.map((tc, i: number) => ({
        role: "tool" as const,
        tool_call_id: tc.id,
        content: toolResults[i]?.text ?? "",
      }));

      const followUp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [...messages, choice.message, ...toolMessages],
          stream: true,
        }),
      });

      if (!followUp.ok || !followUp.body) {
        const combined = toolResults.map((r) => r.text).join("\n\n");
        const metadata = baseMetadata({
          contractContext: toolResults.find((r) => r.contractContext)?.contractContext,
          portfolioPreview: toolResults.find((r) => r.portfolioPreview)?.portfolioPreview,
          safety: toolResults.find((r) => r.safety)?.safety,
          transactionLifecycle: toolResults.find((r) => r.transactionLifecycle)?.transactionLifecycle,
          events: allEvents,
        });
        return new Response(
          JSON.stringify({
            text: combined,
            contractContext: metadata.contractContext,
            portfolioPreview: metadata.portfolioPreview,
            safety: metadata.safety,
            transactionLifecycle: metadata.transactionLifecycle,
            agentContract: metadata.agentContract,
            events: metadata.events,
            correlationId,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "X-Correlation-Id": correlationId,
              ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
            },
          },
        );
      }

      const metadata = baseMetadata({
        contractContext: toolResults.find((r) => r.contractContext)?.contractContext,
        portfolioPreview: toolResults.find((r) => r.portfolioPreview)?.portfolioPreview,
        safety: toolResults.find((r) => r.safety)?.safety,
        transactionLifecycle: toolResults.find((r) => r.transactionLifecycle)?.transactionLifecycle,
        events: allEvents,
      });

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ metadata })}\n\n`));
            const reader = followUp.body!.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
            } catch (e) {
              structuredLog("error", "tool_followup_stream_read_failed", { correlationId, err: String(e) });
              console.error("Tool follow-up stream read failed:", e);
            }
          } finally {
            try {
              controller.close();
            } catch {
              /* already closed */
            }
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "X-Correlation-Id": correlationId,
          ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
        },
      });
    }

    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, stream: true }),
    });

    if (!streamResponse.ok) {
      const text =
        choice?.message?.content ||
        "I'm not sure how to help with that. Try asking about your portfolio, sending tokens, or swapping.";
      const meta = baseMetadata({ events: pipeline.pipelineEvents });
      return new Response(
        JSON.stringify({
          text,
          correlationId,
          agentContract: meta.agentContract,
          events: meta.events,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-Correlation-Id": correlationId,
            ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
          },
        },
      );
    }

    const wrapped = prependSseMetadata(streamResponse.body, baseMetadata({ events: pipeline.pipelineEvents }));
    return new Response(wrapped, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Correlation-Id": correlationId,
        ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
      },
    });
  } catch (e) {
    structuredLog("error", "agent_chat_unhandled", {
      correlationId,
      err: e instanceof Error ? e.message : String(e),
    });
    console.error("agent-chat error:", e);
    const body = backendErrorResponse({
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again.",
      category: "INTERNAL_ERROR",
      recoverable: true,
      correlationId,
      debug: e instanceof Error ? e.message : String(e),
    });
    return new Response(JSON.stringify({ ...body, text: body.message, error: true }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Correlation-Id": correlationId },
    });
  }
}
