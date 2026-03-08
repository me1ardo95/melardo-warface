import Link from "next/link";
import { getTopPlayers } from "@/app/actions/data";
import { HomeGuestLinks } from "./components/HomeGuestLinks";

export default async function Home() {
  const topPlayers = await getTopPlayers(5);
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl space-y-10">
        {/* Приветствие и описание */}
        <section className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            MELARDO WARFACE — киберспортивная платформа
          </h1>
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">
            Соревнования, турниры, рейтинги, лиги. Только честная игра.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <HomeGuestLinks />
          </div>
        </section>

        {/* Карточки-заглушки */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Последние вызовы
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    Команда A — Команда B
                  </span>
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">
                    Запланирован
                  </span>
                </div>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  Скоро здесь появятся последние вызовы.
                </p>
                <Link
                  href="/matches"
                  className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Все вызовы →
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Активные турниры
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                  Турнир Warface #{i}
                </h3>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  Скоро здесь появятся активные турниры.
                </p>
                <Link
                  href="/tournaments"
                  className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Все турниры →
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Топ команд
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-lg font-bold text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                    {i}
                  </div>
                  <div>
                    <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                      Команда #{i}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Скоро здесь появится рейтинг команд.
                    </p>
                  </div>
                </div>
                <Link
                  href="/rankings"
                  className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Рейтинги →
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Топ игроков
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topPlayers.length === 0 ? (
              <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:col-span-2 lg:col-span-3">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Скоро здесь появится рейтинг игроков по личным очкам.
                </p>
                <Link
                  href="/rankings"
                  className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Все игроки →
                </Link>
              </div>
            ) : (
              topPlayers.map((player, i) => (
                <div
                  key={player.id}
                  className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="flex items-center gap-3">
                    {player.avatar_url ? (
                      <img
                        src={player.avatar_url}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-lg font-semibold text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                        {(player.warface_nick || player.display_name || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {player.warface_nick || player.display_name || "Игрок"}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Рейтинг: {(player.points ?? 0)} очков
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                      #{i + 1}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {topPlayers.length > 0 && (
            <Link
              href="/rankings"
              className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Все игроки →
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}
