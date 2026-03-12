import Link from "next/link";
import { getClansLeaderboard } from "@/app/actions/clans";

export default async function ClansPage() {
  const clans = await getClansLeaderboard(100);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl tracking-[0.18em] text-white [font-family:var(--font-display-primary)]">
          Кланы
        </h1>
        <Link href="/clan/create" className="btn-primary inline-flex items-center justify-center text-sm">
          Создать клан
        </Link>
      </div>

      <p className="text-[#9CA3AF]">
        ТОП 100 кланов по рейтингу. Создавайте клан, приглашайте игроков и участвуйте в Clan Wars.
      </p>

      <div className="overflow-hidden rounded-xl border border-[#2A2F3A] bg-[#11141A]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2F3A] bg-[#0f141b] text-left">
              <th className="px-4 py-3 font-medium text-[#9CA3AF]">#</th>
              <th className="px-4 py-3 font-medium text-[#9CA3AF]">Клан</th>
              <th className="px-4 py-3 font-medium text-[#9CA3AF]">Рейтинг</th>
              <th className="px-4 py-3 font-medium text-[#9CA3AF]">Победы</th>
              <th className="px-4 py-3 font-medium text-[#9CA3AF]">Поражения</th>
              <th className="px-4 py-3 font-medium text-[#9CA3AF]">Участники</th>
            </tr>
          </thead>
          <tbody>
            {clans.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[#9CA3AF]">
                  Пока нет кланов
                </td>
              </tr>
            ) : (
              clans.map((c, i) => (
                <tr
                  key={c.id}
                  className="border-b border-[#1F2937] transition-colors hover:bg-[#1a1e24]"
                >
                  <td className="px-4 py-3 font-medium text-[#E5E7EB]">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/clan/${c.id}`}
                      className="flex items-center gap-2 font-medium text-[#F97316] hover:underline"
                    >
                      {c.logo_url ? (
                        <img
                          src={c.logo_url}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1F2937] text-xs text-[#E5E7EB]">
                          {c.tag?.charAt(0) ?? "?"}
                        </span>
                      )}
                      <span>
                        {c.name} <span className="text-[#9CA3AF]">[{c.tag}]</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-white">{c.rating}</td>
                  <td className="px-4 py-3 text-[#10b981]">{c.wins}</td>
                  <td className="px-4 py-3 text-[#ef4444]">{c.losses}</td>
                  <td className="px-4 py-3 text-[#9CA3AF]">{c.member_count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
