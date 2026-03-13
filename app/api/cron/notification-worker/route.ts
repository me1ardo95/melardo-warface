import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTelegramMessage } from "@/lib/telegram";

type QueueRow = {
  id: string;
  user_id: string | null;
  type: string;
  payload: Record<string, any>;
};

type ProfileRow = {
  id: string;
  telegram_id: string | number | null;
  telegram_username: string | null;
};

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7) === cronSecret;
}

function buildMessage(type: string, payload: Record<string, any>): string | null {
  switch (type) {
    case "match_created":
      return [
        "<b>Новый матч создан</b>",
        `Match ID: ${payload.match_id ?? "—"}`,
        payload.lobby_code ? `Lobby Code: ${payload.lobby_code}` : null,
        payload.secret_phrase ? `Secret Phrase: ${payload.secret_phrase}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "match_accepted":
      return [
        "<b>Ваш вызов принят</b>",
        `Match ID: ${payload.match_id ?? "—"}`,
        payload.opponent ? `Соперник: ${payload.opponent}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "match_started":
      return ["<b>Матч начался</b>", `Match ID: ${payload.match_id ?? "—"}`].join("\n");
    case "match_result_submitted":
      return [
        "<b>Результат отправлен</b>",
        `Match ID: ${payload.match_id ?? "—"}`,
        `Счёт: ${payload.score_team1 ?? "-"} : ${payload.score_team2 ?? "-"}`,
      ].join("\n");
    case "match_confirmed":
      return [
        "<b>Результат матча подтверждён</b>",
        `Match ID: ${payload.match_id ?? "—"}`,
        `Счёт: ${payload.score_team1 ?? "-"} : ${payload.score_team2 ?? "-"}`,
      ].join("\n");
    case "match_finished":
      return [
        "<b>Матч завершён</b>",
        `Match ID: ${payload.match_id ?? "—"}`,
        `Счёт: ${payload.score_team1 ?? "-"} : ${payload.score_team2 ?? "-"}`,
      ].join("\n");
    case "match_dispute_created":
      return [
        "<b>По матчу открыт спор</b>",
        `Match ID: ${payload.match_id ?? "—"}`,
        payload.reason ? `Причина: ${payload.reason}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "match_admin_resolved":
      return [
        "<b>Спор по матчу рассмотрен администратором</b>",
        `Match ID: ${payload.match_id ?? "—"}`,
        payload.result ? `Решение: ${payload.result}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "quick_match_found":
      return [
        "<b>Соперник найден</b>",
        payload.match_id ? `Match ID: ${payload.match_id}` : null,
        payload.lobby_code ? `Lobby Code: ${payload.lobby_code}` : null,
        payload.secret_phrase ? `Secret Phrase: ${payload.secret_phrase}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "trust_score_changed":
      return [
        "<b>Изменение рейтинга доверия</b>",
        `Было: ${payload.old_trust_score ?? "—"}`,
        `Стало: ${payload.new_trust_score ?? "—"}`,
      ].join("\n");
    case "smurf_flag_created":
      return [
        "<b>Возможный мультиаккаунт</b>",
        payload.reason ? `Причина: ${payload.reason}` : null,
        payload.confidence_score != null
          ? `Уровень подозрения: ${payload.confidence_score}%`
          : null,
        "",
        "Если это ошибка, свяжитесь с поддержкой.",
      ]
        .filter(Boolean)
        .join("\n");
    case "admin_alert_dispute":
      return [
        "<b>Новый спор</b>",
        payload.match_id ? `Match ID: ${payload.match_id}` : null,
        payload.players ? `Игроки: ${payload.players}` : null,
        payload.link ? `Ссылка: ${payload.link}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "mission_completed":
      return [
        "<b>Миссия выполнена!</b>",
        payload.title ? payload.title : null,
        payload.xp ? `+${payload.xp} XP` : null,
        payload.rating ? `+${payload.rating} рейтинг` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "clan_invited":
      return [
        "<b>Приглашение в клан</b>",
        payload.clan_name ? `Клан: ${payload.clan_name}` : null,
        payload.clan_tag ? `[${payload.clan_tag}]` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "clan_war_started":
      return [
        "<b>Clan War началась!</b>",
        payload.clan1_name && payload.clan2_name
          ? `${payload.clan1_name} vs ${payload.clan2_name}`
          : null,
        payload.format ? `Формат: ${payload.format}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "clan_war_won":
      return [
        "<b>Победа в Clan War!</b>",
        payload.clan_name ? `Клан ${payload.clan_name} победил!` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "tournament_registered":
      return [
        "<b>Регистрация в турнир</b>",
        payload.team_name ? `Команда: ${payload.team_name}` : null,
        payload.tournament_id ? `Tournament ID: ${payload.tournament_id}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "tournament_started":
      return [
        "<b>Турнир начинается</b>",
        payload.tournament_id ? `Tournament ID: ${payload.tournament_id}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "tournament_match_created":
      return [
        "<b>Матч турнира создан</b>",
        payload.tournament_id ? `Tournament ID: ${payload.tournament_id}` : null,
        payload.round ? `Раунд: ${payload.round}` : null,
        payload.match_id ? `Match ID: ${payload.match_id}` : null,
        payload.lobby_code ? `Lobby Code: ${payload.lobby_code}` : null,
        payload.secret_phrase ? `Secret Phrase: ${payload.secret_phrase}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "tournament_round_won":
      return [
        "<b>Победа в раунде</b>",
        payload.tournament_id ? `Tournament ID: ${payload.tournament_id}` : null,
        payload.round ? `Раунд: ${payload.round}` : null,
        payload.match_id ? `Match ID: ${payload.match_id}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "tournament_won":
      return [
        "<b>Победа в турнире!</b>",
        payload.tournament_id ? `Tournament ID: ${payload.tournament_id}` : null,
        payload.match_id ? `Финальный матч: ${payload.match_id}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    default:
      return null;
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const { data: rows } = await supabase
      .from("notification_queue")
      .select("id, user_id, type, payload")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    const queue: QueueRow[] = (rows ?? []) as any;
    if (!queue.length) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    const userIds = [
      ...new Set(
        queue.map((r) => r.user_id).filter((v): v is string => typeof v === "string")
      ),
    ];

    const profilesById = new Map<string, ProfileRow>();
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, telegram_id, telegram_username")
        .in("id", userIds);
      (profiles ?? []).forEach((p) => {
        profilesById.set(p.id as string, {
          id: p.id as string,
          telegram_id: (p as any).telegram_id,
          telegram_username: (p as any).telegram_username ?? null,
        });
      });
    }

    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || null;
    let processed = 0;

    for (const row of queue) {
      const message = buildMessage(row.type, row.payload || {});
      if (!message) {
        await supabase
          .from("notification_queue")
          .update({
            status: "skipped",
            processed_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        continue;
      }

      let chatId: string | number | null = null;

      if (row.type === "admin_alert_dispute") {
        chatId = adminChatId;
      } else if (row.user_id) {
        const profile = profilesById.get(row.user_id);
        if (profile?.telegram_id) {
          chatId = profile.telegram_id;
        }
      }

      if (!chatId) {
        await supabase
          .from("notification_queue")
          .update({
            status: "skipped",
            processed_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        continue;
      }

      const ok = await sendTelegramMessage(chatId, message);

      await supabase
        .from("notification_queue")
        .update({
          status: ok ? "sent" : "failed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (ok) processed += 1;
    }

    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    console.error("[cron/notification-worker]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

