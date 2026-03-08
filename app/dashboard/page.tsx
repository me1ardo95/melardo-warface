import Link from "next/link";

const mockStats = {
  nickname: "PlayerOne",
  rating: 1875,
  matches: 42,
  wins: 26,
  losses: 16,
  winRate: "61.9%",
};

const mockTeam = {
  name: "Cyber Wolves",
  role: "Капитан",
  mode: "5x5",
};

const mockRecentMatches = [
  {
    id: "m1",
    opponent: "Shadow Dragons",
    result: "Победа",
    score: "16 : 12",
    date: "04.03.2026",
  },
  {
    id: "m2",
    opponent: "Night Raiders",
    result: "Поражение",
    score: "13 : 16",
    date: "01.03.2026",
  },
  {
    id: "m3",
    opponent: "Pixel Titans",
    result: "Победа",
    score: "2 : 0",
    date: "26.02.2026",
  },
];

export default function DashboardPage() {
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
          href="/dashboard"
          className="font-medium text-neutral-900 dark:text-neutral-100"
        >
          Личный кабинет
        </Link>
      </nav>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold">Личный кабинет игрока</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Здесь отображается тестовая статистика. Позже здесь можно
              подключить реальные данные из Supabase.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Никнейм
            </h2>
            <p className="mt-2 text-xl font-semibold">{mockStats.nickname}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Рейтинг
            </h2>
            <p className="mt-2 text-xl font-semibold">{mockStats.rating}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Winrate
            </h2>
            <p className="mt-2 text-xl font-semibold">{mockStats.winRate}</p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {mockStats.wins} побед / {mockStats.losses} поражений
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[2fr,1.2fr]">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Последние вызовы
            </h2>
            {mockRecentMatches.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                Пока нет вызовов.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {mockRecentMatches.map((match) => (
                  <li
                    key={match.id}
                    className="flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900/60"
                  >
                    <div>
                      <div className="font-medium">
                        vs {match.opponent} · {match.score}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {match.date}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        match.result === "Победа"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                      }`}
                    >
                      {match.result}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                Команда
              </h2>
              <p className="mt-2 text-base font-semibold">{mockTeam.name}</p>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-neutral-500 dark:text-neutral-400">
                    Роль в команде
                  </dt>
                  <dd>{mockTeam.role}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500 dark:text-neutral-400">
                    Режим
                  </dt>
                  <dd>{mockTeam.mode}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-300">
              <p className="font-medium">Что дальше?</p>
              <p className="mt-1">
                Здесь можно будет показывать прогресс по сезонам, достижения,
                любимые режимы и статистику по турнирам.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

