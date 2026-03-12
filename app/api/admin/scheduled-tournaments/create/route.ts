import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  title?: string;
  startTime?: string;
  maxTeams?: number;
  entryFee?: number;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Необходима авторизация" }, { status: 401 });
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (prof?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Доступ запрещён" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as Body;
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "";
    const startTime = typeof body.startTime === "string" && body.startTime.trim() ? body.startTime.trim() : "";
    const maxTeams = [8, 16, 32].includes(Number(body.maxTeams)) ? Number(body.maxTeams) : 16;
    const entryFee = typeof body.entryFee === "number" && body.entryFee >= 0 ? body.entryFee : 0;

    if (!title) return NextResponse.json({ success: false, error: "Укажите название" }, { status: 400 });
    if (!startTime) return NextResponse.json({ success: false, error: "Укажите время старта" }, { status: 400 });

    const start_date = new Date(startTime);
    if (Number.isNaN(start_date.getTime())) {
      return NextResponse.json({ success: false, error: "Некорректная дата/время" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("scheduled_tournaments")
      .insert({
        title,
        start_time: start_date.toISOString(),
        max_teams: maxTeams,
        entry_fee: entryFee,
        status: "scheduled",
      })
      .select("id, title, start_time, max_teams, entry_fee, status")
      .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Ошибка сервера" },
      { status: 500 }
    );
  }
}
