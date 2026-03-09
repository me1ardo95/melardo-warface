import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Tournament } from "@/lib/types";

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .limit(1);

  const role = profiles?.[0]?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  return { supabase };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await ensureAdmin();
    if (auth instanceof NextResponse) return auth;
    const { supabase } = auth;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID не указан" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ошибка сервера" },
      { status: 500 }
    );
  }
}

type EditBody = {
  name?: string;
  mode?: "5x5" | "8x8" | string;
  format?: "single_elimination" | "round_robin" | string;
  maxTeams?: number;
  startDate?: string;
  endDate?: string | null;
  status?: Tournament["status"];
  prizePool?: number | null;
  description?: string | null;
};

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await ensureAdmin();
    if (auth instanceof NextResponse) return auth;
    const { supabase } = auth;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID турнира не указан" }, { status: 400 });
    }

    const body = (await _request.json().catch(() => ({}))) as EditBody;

    const updatePayload: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim()) {
      updatePayload.name = body.name.trim();
    }
    if (body.mode === "8x8" || body.mode === "5x5") {
      updatePayload.game = body.mode;
    }
    if (body.format === "round_robin" || body.format === "single_elimination") {
      updatePayload.format = body.format;
    }
    if (typeof body.maxTeams === "number" && body.maxTeams > 0) {
      updatePayload.max_teams = body.maxTeams;
    }
    if (typeof body.startDate === "string" && body.startDate.trim()) {
      updatePayload.start_date = new Date(`${body.startDate}T00:00:00.000Z`).toISOString();
    }
    if (body.endDate === null || (typeof body.endDate === "string" && body.endDate.trim())) {
      updatePayload.end_date = body.endDate?.trim() || null;
    }
    if (["upcoming", "ongoing", "completed", "cancelled"].includes(body.status ?? "")) {
      updatePayload.status = body.status;
    }
    if (body.prizePool !== undefined) {
      updatePayload.prize_pool = body.prizePool;
    }
    if (body.description !== undefined) {
      updatePayload.description = body.description?.trim() || null;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "Нет данных для обновления" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tournaments")
      .update(updatePayload)
      .eq("id", id)
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Не удалось обновить турнир" },
        { status: 400 }
      );
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ошибка сервера" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await ensureAdmin();
    if (auth instanceof NextResponse) return auth;
    const { supabase } = auth;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID турнира не указан" }, { status: 400 });
    }

    const { error } = await supabase
      .from("tournaments")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Не удалось удалить турнир" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ошибка сервера" },
      { status: 500 }
    );
  }
}
