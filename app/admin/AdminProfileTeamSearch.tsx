"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminProfileTeamSearch() {
  const router = useRouter();
  const supabase = createClient();

  const [playerNick, setPlayerNick] = useState("");
  const [teamName, setTeamName] = useState("");
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [isSearchingPlayer, setIsSearchingPlayer] = useState(false);
  const [isSearchingTeam, setIsSearchingTeam] = useState(false);

  const handlePlayerSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlayerError(null);
    const nick = playerNick.trim();
    if (!nick) {
      setPlayerError("Введите ник игрока (warface_nick).");
      return;
    }

    setIsSearchingPlayer(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, warface_nick, display_name, email")
        .ilike("warface_nick", nick)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setPlayerError("Игрок с таким ником не найден.");
        return;
      }

      router.push(`/admin/player-view/${data.id}`);
    } catch {
      setPlayerError("Ошибка поиска игрока. Попробуйте позже.");
    } finally {
      setIsSearchingPlayer(false);
    }
  };

  const handleTeamSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamError(null);
    const name = teamName.trim();
    if (!name) {
      setTeamError("Введите название команды.");
      return;
    }

    setIsSearchingTeam(true);
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .ilike("name", name)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setTeamError("Команда с таким названием не найдена.");
        return;
      }

      router.push(`/admin/team-view/${data.id}`);
    } catch {
      setTeamError("Ошибка поиска команды. Попробуйте позже.");
    } finally {
      setIsSearchingTeam(false);
    }
  };

  return (
    <div className="mt-8 space-y-6 rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">
        👁️ ПРОСМОТР ПРОФИЛЕЙ И КОМАНД
      </h2>

      <div className="space-y-4">
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            🔍 Поиск игрока
          </h3>
          <form
            onSubmit={handlePlayerSearch}
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <input
              type="text"
              value={playerNick}
              onChange={(e) => setPlayerNick(e.target.value)}
              placeholder="Ник игрока (warface_nick)"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
              disabled={isSearchingPlayer}
            />
            <button
              type="submit"
              disabled={isSearchingPlayer}
              className="inline-flex items-center justify-center rounded-md bg-amber-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {isSearchingPlayer ? "Поиск…" : "Перейти к профилю игрока"}
            </button>
          </form>
          {playerError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {playerError}
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            🔍 Поиск команды
          </h3>
          <form
            onSubmit={handleTeamSearch}
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Название команды"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
              disabled={isSearchingTeam}
            />
            <button
              type="submit"
              disabled={isSearchingTeam}
              className="inline-flex items-center justify-center rounded-md bg-amber-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {isSearchingTeam ? "Поиск…" : "Перейти к странице команды"}
            </button>
          </form>
          {teamError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {teamError}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

