import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateWarfaceNick, WARFACE_NICK_TAKEN_ERROR } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { warface_nick, avatar_url, rank } = (body ?? {}) as {
      warface_nick?: string;
      avatar_url?: string;
      rank?: number;
    };

    if (!warface_nick || typeof warface_nick !== "string" || !warface_nick.trim()) {
      return NextResponse.json(
        { error: "Укажите ник в Warface" },
        { status: 400 }
      );
    }

    const warfaceNickTrimmed = warface_nick.trim();
    const nickValidation = validateWarfaceNick(warfaceNickTrimmed);
    if (!nickValidation.valid) {
      return NextResponse.json(
        { error: nickValidation.error },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .ilike("warface_nick", warfaceNickTrimmed)
      .neq("id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: WARFACE_NICK_TAKEN_ERROR },
        { status: 400 }
      );
    }

    const warfaceNickValue = warfaceNickTrimmed;
    const avatarUrlValue =
      avatar_url !== undefined && typeof avatar_url === "string" && avatar_url.trim()
        ? avatar_url.trim()
        : null;

    const rankValue =
      rank !== undefined && typeof rank === "number" && Number.isInteger(rank) && rank >= 1 && rank <= 100
        ? rank
        : undefined;

    const updateData: Record<string, unknown> = {
      display_name: warfaceNickValue,
      warface_nick: warfaceNickValue,
      avatar_url: avatarUrlValue,
    };
    if (rankValue !== undefined) updateData.rank = rankValue;

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
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
