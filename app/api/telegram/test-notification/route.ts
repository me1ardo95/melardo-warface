import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTelegramMessage } from "@/lib/telegram";

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7) === cronSecret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      profileId?: string;
      code?: string; // alias
    };

    const profileId =
      typeof body.profileId === "string"
        ? body.profileId.trim()
        : typeof body.code === "string"
          ? body.code.trim()
          : "";

    if (!profileId) {
      return NextResponse.json(
        { success: false, message: "Отсутствует profileId (или code)." },
        { status: 400 }
      );
    }

    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!telegramToken) {
      return NextResponse.json(
        {
          success: false,
          message: "TELEGRAM_BOT_TOKEN не настроен на сервере.",
        },
        { status: 500 }
      );
    }

    const supabase = createServiceClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, telegram_id")
      .eq("id", profileId)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    const telegramId = (profile as any)?.telegram_id as string | number | null;
    if (!telegramId) {
      return NextResponse.json(
        {
          success: false,
          message: "У профиля отсутствует telegram_id — сначала подключите Telegram.",
        },
        { status: 404 }
      );
    }

    const text = "Тестовое уведомление MELARDO. Telegram-уведомления работают.";
    const ok = await sendTelegramMessage(telegramId, text);

    if (!ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Не удалось отправить тестовое сообщение в Telegram (проверьте логи/настройки бота).",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Тестовое Telegram-уведомление отправлено." },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

