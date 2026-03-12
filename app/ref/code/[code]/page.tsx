import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ code: string }> };

export default async function ReferralCodeRedirectPage({ params }: Props) {
  const { code } = await params;
  const cookieStore = await cookies();

  cookieStore.set("ref_code", decodeURIComponent(code), {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/register");
}

