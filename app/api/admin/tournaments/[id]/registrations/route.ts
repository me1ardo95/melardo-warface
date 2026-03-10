import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Team = {
  id: string;
  name: string;
  logo_url?: string | null;
  mode?: string | null;
};

type RegistrationRow = {
  id: string;
  team_id: string;
  teams: Team | Team[] | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    if (profiles?.[0]?.role !== "admin") {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID турнира не указан" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tournament_registrations")
      .select(`
        id,
        team_id,
        teams(id, name, logo_url, mode)
      `)
      .eq("tournament_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const rows = (data ?? []) as unknown as RegistrationRow[];
    const teams: Team[] = rows
      .map((r) => (Array.isArray(r.teams) ? r.teams[0] : r.teams))
      .filter((team): team is Team => Boolean(team));

    return NextResponse.json({ teams });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ошибка сервера" },
      { status: 500 }
    );
  }
}
