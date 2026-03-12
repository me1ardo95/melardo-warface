const TELEGRAM_API_BASE = "https://api.telegram.org";

export async function sendTelegramMessage(
  chatId: string | number,
  text: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN is not set, skipping message");
    return false;
  }

  if (!text.trim()) {
    return false;
  }

  try {
    const res = await fetch(
      `${TELEGRAM_API_BASE}/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[telegram] Failed to send message", res.status, body);
      return false;
    }

    return true;
  } catch (err) {
    console.error(
      "[telegram] Error while sending message",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

