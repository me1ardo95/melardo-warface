"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateWarfaceNick, WARFACE_NICK_TAKEN_ERROR } from "@/lib/validation";
import { cookies } from "next/headers";
import { getActiveSeason } from "@/lib/missions";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/profile");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const warfaceNickRaw = formData.get("warfaceNick") as string | null;
  const warfaceNick = typeof warfaceNickRaw === "string" ? warfaceNickRaw.trim() : "";

  if (!warfaceNick) {
    return { error: "Укажите ник в Warface" };
  }
  const nickValidation = validateWarfaceNick(warfaceNick);
  if (!nickValidation.valid) {
    return { error: nickValidation.error };
  }
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .ilike("warface_nick", warfaceNick)
    .maybeSingle();
  if (existing) {
    return { error: WARFACE_NICK_TAKEN_ERROR };
  }

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: warfaceNick },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (signUpData.user) {
    // 1) Сгенерировать уникальный invite_code
    let inviteCode: string | null = null;
    for (let i = 0; i < 5; i++) {
      const candidate = Array.from({ length: 8 })
        .map(() => {
          const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join("");
      const { data: existingCode } = await supabase
        .from("profiles")
        .select("id")
        .eq("invite_code", candidate)
        .maybeSingle();
      if (!existingCode) {
        inviteCode = candidate;
        break;
      }
    }

    await supabase
      .from("profiles")
      .update({
        warface_nick: warfaceNick,
        display_name: warfaceNick,
        ...(inviteCode ? { invite_code: inviteCode } : {}),
      })
      .eq("id", signUpData.user.id);

    try {
      const cookieStore = await cookies();
      const refCode = cookieStore.get("ref_code")?.value;

      if (refCode) {
        const { data: referrerProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("invite_code", refCode)
          .maybeSingle();

        if (referrerProfile?.id && referrerProfile.id !== signUpData.user.id) {
          // 2) Создать запись в referrals
          await supabase.from("referrals").insert({
            referrer_user_id: referrerProfile.id,
            referred_user_id: signUpData.user.id,
            status: "pending",
          });

          // 3) Начислить награды (+10 рейтинга, +50 сезонного XP)
          const activeSeason = await getActiveSeason();

          for (const uid of [referrerProfile.id, signUpData.user.id]) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("points")
              .eq("id", uid)
              .single();
            const newPoints = (prof?.points ?? 0) + 10;
            await supabase.from("profiles").update({ points: newPoints }).eq("id", uid);

            if (activeSeason) {
              const seasonId = activeSeason.id;
              const { data: sp } = await supabase
                .from("season_progress")
                .select("xp, level")
                .eq("user_id", uid)
                .eq("season_id", seasonId)
                .maybeSingle();
              const prevXp = sp?.xp ?? 0;
              const newXp = prevXp + 50;
              await supabase
                .from("season_progress")
                .upsert(
                  {
                    user_id: uid,
                    season_id: seasonId,
                    xp: newXp,
                    level: sp?.level ?? 1,
                  },
                  { onConflict: "user_id,season_id" }
                );
            }
          }
        }

        cookieStore.set("ref_code", "", { path: "/", maxAge: 0 });
      }
    } catch {
      // реферал необязателен
    }
  }

  revalidatePath("/", "layout");
  redirect("/profile");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
