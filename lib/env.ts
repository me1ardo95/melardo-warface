const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
] as const;

let checked = false;

export function validateEnv(): void {
  if (checked) return;
  const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    console.error(
      "[ENV] Отсутствуют обязательные переменные окружения:",
      missing.join(", ")
    );
  }
  checked = true;
}
