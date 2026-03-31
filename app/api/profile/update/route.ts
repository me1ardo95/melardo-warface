import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
    const { display_name, warface_nick, avatar_url, rank } = (body ?? {}) as {
      display_name?: string;
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
    const displayNameValue =
      typeof display_name === "string" && display_name.trim()
        ? display_name.trim()
        : null;
    const rankValue =
      rank !== undefined &&
      typeof rank === "number" &&
      Number.isInteger(rank) &&
      rank >= 1 &&
      rank <= 1000
        ? rank
        : undefined;

    const updateData: Record<string, unknown> = {
      warface_nick: warfaceNickValue,
    };

    if (displayNameValue !== null) {
      updateData.display_name = displayNameValue;
    }

    // Не трогаем `avatar_url`, если на клиенте поле не было передано.
    // Это важно, чтобы не затирать уже сохранённый аватар пустым значением.
    if (avatar_url !== undefined) {
      updateData.avatar_url =
        typeof avatar_url === "string" && avatar_url.trim() ? avatar_url.trim() : null;
    }

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

    // Убеждаемся, что /profile и шапка/сидебар получат свежие данные.
    revalidatePath("/profile");
    revalidatePath("/", "layout");

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
