// Deno runtime (Supabase Edge Functions)
import { createClient } from "@supabase/supabase-js";

// ---- Required secrets (set via `supabase secrets set ...`) ----
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY   (⚠️ service role, server-side only)
// - ADMIN_SECRET                (a long random string; required to call this function)
// - EXPO_ACCESS_TOKEN           (optional; only if you enabled Expo "Enhanced Security")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET") || "";
const EXPO_ACCESS_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN") || "";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Helper: chunk an array into batches
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type RequestBody = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;

  // Filtering (optional). If you store *emails* in push_tokens.user_id, use `emails`.
  // If you store UUIDs instead, use `user_ids`.
  emails?: string[];
  user_ids?: string[];

  // If true, does not call Expo; just returns the count that *would* be targeted.
  dryRun?: boolean;
};

Deno.serve(async (req) => {
  try {
    // Basic shared-secret auth so randoms can’t trigger broadcasts.
    const headerSecret = req.headers.get("x-admin-secret") || "";
    if (!ADMIN_SECRET || headerSecret !== ADMIN_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(JSON.stringify({ error: "Content-Type must be application/json" }), {
        status: 400,
      });
    }

    const body: RequestBody = await req.json();
    const { title, body: msg, data, sound = "default", emails, user_ids, dryRun } = body;

    if (!title || !msg) {
      return new Response(JSON.stringify({ error: "Missing title or body" }), { status: 400 });
    }

    // Build the base query
    let query = supabase.from("push_tokens").select("expo_push_token, user_id");

    // Apply filter if provided
    if (emails?.length) {
      // If you store emails lowercased in user_id (recommended)
      query = query.in("user_id", emails.map((e) => e.toLowerCase()));
    } else if (user_ids?.length) {
      // If you store UUIDs in user_id
      query = query.in("user_id", user_ids);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const tokens = (rows ?? [])
      .map((r) => r.expo_push_token)
      .filter(
        (t): t is string =>
          typeof t === "string" && t.startsWith("ExponentPushToken[")
      );

    if (!tokens.length) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, detail: "No tokens found for selection." }),
        { status: 200 }
      );
    }

    // Build payloads
    const messages = tokens.map((to) => ({ to, sound, title, body: msg, data }));

    if (dryRun) {
      return new Response(
        JSON.stringify({ ok: true, dryRun: true, targetCount: messages.length }, null, 2),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Send in chunks of 100 (Expo limit)
    const batches = chunk(messages, 100);
    const results: unknown[] = [];

    for (const batch of batches) {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(batch),
      });

      const json = await res.json();
      results.push(json);
    }

    return new Response(
      JSON.stringify({ ok: true, sent: messages.length, batches: batches.length, results }, null, 2),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
