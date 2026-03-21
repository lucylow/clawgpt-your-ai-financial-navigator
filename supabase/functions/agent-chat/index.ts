import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { handleAgentChatRequest } from "../_shared/serve.ts";

Deno.serve(handleAgentChatRequest);
