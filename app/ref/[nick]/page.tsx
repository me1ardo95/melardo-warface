import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ nick: string }> };

export default async function ReferralRedirectPage({ params }: Props) {
  const { nick } = await params;
  const cookieStore = await cookies();

  cookieStore.set("ref_nick", decodeURIComponent(nick), {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 дней
  });

  redirect("/register");
}

