"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateWarfaceNick, WARFACE_NICK_TAKEN_ERROR } from "@/lib/validation";
import { cookies } from "next/headers";

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
    await supabase
      .from("profiles")
      .update({ warface_nick: warfaceNick, display_name: warfaceNick })
      .eq("id", signUpData.user.id);

    try {
      const cookieStore = await cookies();
      const refNick = cookieStore.get("ref_nick")?.value;

      if (refNick) {
        const { data: referrerProfile } = await supabase
          .from("profiles")
          .select("id")
          .ilike("warface_nick", refNick)
          .maybeSingle();

        if (referrerProfile?.id && referrerProfile.id !== signUpData.user.id) {
          await supabase.from("referrals").insert({
            referrer_user_id: referrerProfile.id,
            referred_user_id: signUpData.user.id,
            status: "pending",
          });
        }

        cookieStore.set("ref_nick", "", { path: "/", maxAge: 0 });
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
