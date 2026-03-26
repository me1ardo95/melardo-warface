import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTelegramMessage } from "@/lib/telegram";

type TelegramUser = {
  id?: number;
  username?: string;
};

type TelegramChat = {
  id?: number;
  type?: string;
};

type TelegramMessage = {
  message_id?: number;
  text?: string;
  from?: TelegramUser;
  chat?: TelegramChat;
};

type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

function extractStartPayload(textRaw: string): string | null {
  const text = textRaw.trim();
  if (!text) return null;

  // Telegram может прислать: "/start", "/start payload", "/start@Bot payload"
  const m = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  if (!m) return null;

  const payloadRaw = (m[1] ?? "").trim();
  if (!payloadRaw) return "";

  try {
    return decodeURIComponent(payloadRaw);
  } catch {
    return payloadRaw;
  }
}

function pickIncomingMessage(update: TelegramUpdate): TelegramMessage | null {
  return update.message ?? update.edited_message ?? null;
}

async function linkTelegramAccount(params: {
  code: string;
  telegramId: number;
  telegramUsername: string | null;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = createServiceClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", params.code)
    .single();

  if (profileError) {
    return { ok: false, reason: profileError.message };
  }

  if (!profile) {
    return { ok: false, reason: "Профиль не найден для указанного кода." };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      telegram_id: params.telegramId,
      telegram_username: params.telegramUsername,
      telegram_connected_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updateError) {
    return { ok: false, reason: updateError.message };
  }

  return { ok: true };
}

export async function POST(request: Request) {
  // Вебхук должен быть максимально устойчивым: не падать на мусорных апдейтах
  try {
    const update = (await request.json().catch(() => ({}))) as TelegramUpdate;
    const message = pickIncomingMessage(update);

    const chatId = message?.chat?.id;
    const fromId = message?.from?.id;
    const text = typeof message?.text === "string" ? message.text : "";

    if (!chatId || !fromId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const payload = extractStartPayload(text);
    if (payload === null) {
      // Не /start — игнорируем, но отвечать не обязаны
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (payload === "") {
      await sendTelegramMessage(
        chatId,
        [
          "<b>Подключение Telegram</b>",
          "",
          "Команда получена, но код подключения отсутствует.",
          "Откройте страницу подключения на сайте и нажмите «Подключить Telegram», либо отправьте:",
          "<code>/start &lt;ваш_код&gt;</code>",
        ].join("\n")
      );
      return NextResponse.json({ ok: true });
    }

    const code = payload.trim();
    const telegramUsername =
      typeof message?.from?.username === "string" && message.from.username.trim()
        ? message.from.username.trim()
        : null;

    const result = await linkTelegramAccount({
      code,
      telegramId: chatId,
      telegramUsername,
    });

    if (result.ok) {
      await sendTelegramMessage(
        chatId,
        [
          "<b>Telegram успешно подключён</b>",
          "",
          "Теперь вы будете получать уведомления от платформы в этом чате.",
        ].join("\n")
      );
      return NextResponse.json({ ok: true, linked: true });
    }

    await sendTelegramMessage(
      chatId,
      [
        "<b>Не удалось подключить Telegram</b>",
        "",
        `Причина: ${result.reason}`,
        "",
        "Проверьте, что вы отправили команду из кнопки на странице подключения (код должен совпадать с ID аккаунта).",
      ].join("\n")
    );
    return NextResponse.json({ ok: true, linked: false });
  } catch (err) {
    console.error("[telegram-webhook] Unexpected error", err);
    // Возвращаем 200, чтобы Telegram не долбил ретраями из-за внутренних ошибок,
    // но оставляем лог для диагностики.
    return NextResponse.json({ ok: true });
  }
}

export const dynamic = "force-dynamic";

