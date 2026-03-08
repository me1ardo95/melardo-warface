import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/app/actions/data";
import type { TournamentRequest } from "@/lib/types";

async function getTournamentRequests(): Promise<TournamentRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as TournamentRequest[];
}

async function handleRequest(
  id: string,
  action: "approve" | "reject",
  reason?: string
) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Необходима авторизация");
  }

  const updates: Partial<TournamentRequest> & { status: TournamentRequest["status"] } =
    {
      status: action === "approve" ? "approved" : "rejected",
    };
  if (action === "reject") {
    updates.rejection_reason = reason?.trim() || "Отклонено администратором";
  }

  const { data: existing } = await supabase
    .from("tournament_requests")
    .select(
      "id, user_id, title, mode, format, min_teams, max_teams, requested_date"
    )
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("tournament_requests")
    .update(updates)
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  if (action === "approve" && existing) {
    await supabase.from("tournaments").insert({
      name: existing.title,
      game: "Warface",
      format: existing.format,
      start_date: existing.requested_date,
      end_date: existing.requested_date,
      status: "upcoming",
    });
  }

  try {
    if (existing) {
      await supabase.from("user_notifications").insert({
        user_id: existing.user_id,
        type: "tournament_request_status",
        message:
          action === "approve"
            ? `Ваша заявка на турнир "${existing.title}" одобрена.`
            : `Ваша заявка на турнир "${existing.title}" отклонена.`,
      });
    }
  } catch {
  }
}

export default async function AdminTournamentRequestsPage() {
  const [profile, requests] = await Promise.all([
    getCurrentProfile(),
    getTournamentRequests(),
  ]);
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen p-6">
      <nav className="mb-6 flex items-center gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <Link
          href="/"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Главная
        </Link>
        <Link
          href="/profile"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Профиль
        </Link>
        <Link
          href="/teams"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Команды
        </Link>
        <Link
          href="/matches"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Вызовы
        </Link>
        <Link
          href="/tournaments"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Турниры
        </Link>
        <Link
          href="/rankings"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Рейтинги
        </Link>
        <Link
          href="/admin"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Админ
        </Link>
        <Link
          href="/admin/tournament-requests"
          className="font-medium text-neutral-900 dark:text-neutral-100"
        >
          Заявки на турниры
        </Link>
      </nav>

      <div className="mx-auto max-w-4xl">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Заявки на турниры
        </h1>
        {requests.length === 0 ? (
          <p className="mt-4 text-neutral-500 dark:text-neutral-400">
            Заявок пока нет.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {requests.map((req) => (
              <li
                key={req.id}
                className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                      {req.title}
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Режим: {req.mode} · Формат:{" "}
                      {req.format === "round_robin"
                        ? "Round Robin"
                        : "Single Elimination"}{" "}
                      · Команд:{" "}
                      {req.min_teams === req.max_teams
                        ? req.min_teams
                        : `${req.min_teams ?? "?"}–${req.max_teams ?? "?"}`}
                    </p>
                    {req.requested_date && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Предполагаемая дата:{" "}
                        {new Date(req.requested_date).toLocaleDateString("ru-RU")}
                      </p>
                    )}
                    {req.comment && (
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                        {req.comment}
                      </p>
                    )}
                    {req.status !== "pending" && (
                      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                        Статус:{" "}
                        {req.status === "approved"
                          ? "Одобрено"
                          : "Отклонено"}{" "}
                        {req.rejection_reason
                          ? `· Причина: ${req.rejection_reason}`
                          : null}
                      </p>
                    )}
                  </div>
                  {req.status === "pending" && (
                    <div className="flex flex-col items-stretch gap-2 text-sm">
                      <form
                        action={async () => {
                          "use server";
                          await handleRequest(req.id, "approve");
                        }}
                      >
                        <button
                          type="submit"
                          className="w-full rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
                        >
                          Одобрить и создать турнир
                        </button>
                      </form>
                      <form
                        action={async (formData) => {
                          "use server";
                          const reason =
                            (formData.get("reason") as string | null) ?? undefined;
                          await handleRequest(req.id, "reject", reason);
                        }}
                        className="space-y-2"
                      >
                        <input
                          type="text"
                          name="reason"
                          placeholder="Причина отклонения (необязательно)"
                          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                        />
                        <button
                          type="submit"
                          className="w-full rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
                        >
                          Отклонить
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

