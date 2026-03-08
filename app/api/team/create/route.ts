import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateTeamNameFull } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
    }

    const { data: existingCaptain } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .eq("role", "captain")
      .limit(1)
      .maybeSingle();

    if (existingCaptain) {
      return NextResponse.json(
        { error: "Вы уже являетесь капитаном команды" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, logo, city, description } = body as {
      name?: string;
      logo?: string;
      city?: string;
      description?: string;
    };

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Укажите название команды" },
        { status: 400 }
      );
    }

    const nameTrimmed = name.trim();
    const nameValidation = validateTeamNameFull(nameTrimmed);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      );
    }

    const logoUrl =
      logo && typeof logo === "string" && logo.trim() ? logo.trim() : null;
    const cityValue =
      city && typeof city === "string" ? city.trim() || null : null;
    const descriptionValue =
      description && typeof description === "string"
        ? description.trim() || null
        : null;

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        name: nameTrimmed,
        logo_url: logoUrl,
        city: cityValue,
        description: descriptionValue,
      })
      .select("id, name, logo_url, city, description, created_at")
      .single();

    if (teamError) {
      return NextResponse.json(
        { error: teamError.message },
        { status: 400 }
      );
    }

    const { error: memberError } = await supabase.from("team_members").insert({
      team_id: team.id,
      user_id: user.id,
      role: "captain",
    });

    if (memberError) {
      return NextResponse.json(
        { error: memberError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(team);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Внутренняя ошибка сервера",
      },
      { status: 500 }
    );
  }
}
