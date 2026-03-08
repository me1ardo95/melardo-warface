"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function HomeGuestLinks() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthorized(!!user);
    });
  }, []);

  if (authorized === null || authorized) return null;

  return (
    <>
      <Link
        href="/login"
        className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Вход
      </Link>
      <Link
        href="/register"
        className="rounded-md border border-neutral-300 px-4 py-2 font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
      >
        Регистрация
      </Link>
    </>
  );
}
