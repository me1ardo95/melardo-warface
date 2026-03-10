import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/app/actions/data";
import { AdminNav } from "../AdminNav";

async function adjustPlayerPoints(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const nick = String(formData.get("nick") || "").trim();
  const deltaRaw = String(formData.get("delta") || "").trim();
  const comment = String(formData.get("comment") || "").trim() || null;

  const delta = Number(deltaRaw);
  if (!nick || !Number.isFinite(delta) || delta === 0) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, points")
    .ilike("warface_nick", nick)
    .maybeSingle();

  if (!profile) return;

  const newPoints = (profile.points ?? 0) + delta;
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ points: newPoints })
    .eq("id", profile.id);

  if (updateError) return;

  await supabase.from("profile_points_history").insert({
    profile_id: profile.id,
    delta,
    comment,
  });
}

async function adjustTeamPoints(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const name = String(formData.get("teamName") || "").trim();
  const deltaRaw = String(formData.get("delta") || "").trim();
  const comment = String(formData.get("comment") || "").trim() || null;

  const delta = Number(deltaRaw);
  if (!name || !Number.isFinite(delta) || delta === 0) return;

  const { data: team } = await supabase
    .from("teams")
    .select("id, points")
    .ilike("name", name)
    .maybeSingle();

  if (!team) return;

  const newPoints = (team.points ?? 0) + delta;
  const { error: updateError } = await supabase
    .from("teams")
    .update({ points: newPoints })
    .eq("id", team.id);

  if (updateError) return;

  await supabase.from("team_points_history").insert({
    team_id: team.id,
    delta,
    comment,
  });
}

export default async function AdminPointsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen p-6">
      <AdminNav active="points" />

      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        <div className="card-surface p-6">
          <h2 className="text-sm tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
            Игроку
          </h2>
          <form action={adjustPlayerPoints} className="mt-4 space-y-4 text-sm">
            <div>
              <label
                htmlFor="nick"
                className="mb-1 block text-xs font-medium text-[#D1D5DB]"
              >
                Ник игрока
              </label>
              <input
                id="nick"
                name="nick"
                className="w-full rounded-md border border-[#2A2F3A] bg-[#11141A] px-3 py-2 text-sm text-white placeholder-[#6B7280]"
                placeholder="Боевой ник в Warface"
                required
              />
            </div>
            <div>
              <label
                htmlFor="delta"
                className="mb-1 block text-xs font-medium text-[#D1D5DB]"
              >
                Количество очков (+ или -)
              </label>
              <input
                id="delta"
                name="delta"
                type="number"
                className="w-full rounded-md border border-[#2A2F3A] bg-[#11141A] px-3 py-2 text-sm text-white"
                required
              />
            </div>
            <div>
              <label
                htmlFor="comment"
                className="mb-1 block text-xs font-medium text-[#D1D5DB]"
              >
                Комментарий (за что)
              </label>
              <textarea
                id="comment"
                name="comment"
                rows={3}
                className="w-full rounded-md border border-[#2A2F3A] bg-[#11141A] px-3 py-2 text-sm text-white placeholder-[#6B7280]"
                placeholder="Например: MVP недели, ручная корректировка и т.п."
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full text-xs uppercase tracking-wide"
            >
              Начислить
            </button>
          </form>
        </div>

        <div className="card-surface p-6">
          <h2 className="text-sm tracking-[0.18em] text-[#F9FAFB] [font-family:var(--font-display-primary)]">
            Команде
          </h2>
          <form action={adjustTeamPoints} className="mt-4 space-y-4 text-sm">
            <div>
              <label
                htmlFor="teamName"
                className="mb-1 block text-xs font-medium text-[#D1D5DB]"
              >
                Название команды
              </label>
              <input
                id="teamName"
                name="teamName"
                className="w-full rounded-md border border-[#2A2F3A] bg-[#11141A] px-3 py-2 text-sm text-white placeholder-[#6B7280]"
                placeholder="Название команды"
                required
              />
            </div>
            <div>
              <label
                htmlFor="team-delta"
                className="mb-1 block text-xs font-medium text-[#D1D5DB]"
              >
                Количество очков (+ или -)
              </label>
              <input
                id="team-delta"
                name="delta"
                type="number"
                className="w-full rounded-md border border-[#2A2F3A] bg-[#11141A] px-3 py-2 text-sm text-white"
                required
              />
            </div>
            <div>
              <label
                htmlFor="team-comment"
                className="mb-1 block text-xs font-medium text-[#D1D5DB]"
              >
                Комментарий (за что)
              </label>
              <textarea
                id="team-comment"
                name="comment"
                rows={3}
                className="w-full rounded-md border border-[#2A2F3A] bg-[#11141A] px-3 py-2 text-sm text-white placeholder-[#6B7280]"
                placeholder="Например: победа в офлайн‑ивенте, партнёрский бонус и т.п."
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full text-xs uppercase tracking-wide"
            >
              Начислить
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

