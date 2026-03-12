import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(36);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const deviceFingerprint = typeof body?.device_fingerprint === "string"
      ? body.device_fingerprint.trim().slice(0, 256)
      : null;

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
    const userAgent = request.headers.get("user-agent") ?? "";

    const ipHash = simpleHash(ip);
    const userAgentHash = simpleHash(userAgent);

    const serviceSupabase = createServiceClient();
    await serviceSupabase.from("user_sessions").insert({
      user_id: user.id,
      ip_hash: ipHash,
      user_agent_hash: userAgentHash,
      device_fingerprint: deviceFingerprint,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
