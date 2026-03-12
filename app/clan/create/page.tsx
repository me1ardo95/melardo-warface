import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/app/actions/data";
import { getCurrentUserClan } from "@/app/actions/clans";
import CreateClanForm from "./CreateClanForm";

export default async function CreateClanPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const myClan = await getCurrentUserClan();
  if (myClan) redirect(`/clan/${myClan.clan.id}`);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link
        href="/clans"
        className="inline-flex text-sm text-[#9CA3AF] hover:text-white"
      >
        ← К списку кланов
      </Link>

      <h1 className="text-xl tracking-[0.18em] text-white [font-family:var(--font-display-primary)]">
        Создать клан
      </h1>

      <CreateClanForm />
    </div>
  );
}
