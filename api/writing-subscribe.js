import { withSupabase } from "@supabase/server";

export const config = {
  runtime: "edge",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });

const subscribe = withSupabase(
  { auth: "none", cors: false },
  async (request, ctx) => {
    if (request.method !== "POST") {
      return json({ message: "Method not allowed" }, 405);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ message: "Invalid JSON body" }, 400);
    }

    const email = String(payload?.email ?? "")
      .trim()
      .toLowerCase();

    if (!emailPattern.test(email) || email.length > 254) {
      return json({ message: "Enter a valid email address." }, 400);
    }

    const source =
      typeof payload?.source === "string" && payload.source.trim()
        ? payload.source.trim().slice(0, 80)
        : "writing";

    const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

    const { error } = await ctx.supabaseAdmin
      .from("writing_subscribers")
      .insert({
        email,
        source,
        user_agent: userAgent,
      });

    if (error && error.code !== "23505") {
      console.error("Failed to store writing subscriber", error);
      return json({ message: "Could not save your email right now." }, 500);
    }

    return json({ ok: true });
  },
);

export default subscribe;
