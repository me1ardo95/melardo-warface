"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [state, formAction] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await login(formData);
      return result?.error ? { error: result.error } : null;
    },
    null
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-xl font-semibold">Вход</h1>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          )}
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Эл. почта
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              placeholder="ваш@email.com"
              suppressHydrationWarning
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Пароль
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPwd ? "text" : "password"}
                required
                autoComplete="current-password"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 pr-10 text-neutral-900 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                suppressHydrationWarning
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? "Скрыть пароль" : "Показать пароль"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 py-1 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              >
                👁️
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
          >
            Войти
          </button>
        </form>
        <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            Забыли пароль?
          </button>
        </p>
        {showForgotPassword && (
          <div className="mt-4 space-y-4 rounded-md border border-neutral-200 p-4 dark:border-neutral-700">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Восстановление пароля
            </p>
            {resetSuccess ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Письмо для восстановления пароля отправлено на вашу почту.
              </p>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="reset-email"
                    className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Эл. почта
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="ваш@email.com"
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>
                {resetError && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {resetError}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const email = resetEmail.trim();
                      if (!email) {
                        setResetError("Укажите адрес почты.");
                        return;
                      }
                      setResetError(null);
                      setResetSubmitting(true);
                      try {
                        const supabase = createClient();
                        const { error } =
                          await supabase.auth.resetPasswordForEmail(email);
                        if (error) throw error;
                        setResetSuccess(true);
                      } catch (e) {
                        setResetError(
                          e instanceof Error ? e.message : "Не удалось отправить письмо."
                        );
                      } finally {
                        setResetSubmitting(false);
                      }
                    }}
                    disabled={resetSubmitting}
                    className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 dark:focus:ring-offset-neutral-900"
                  >
                    {resetSubmitting ? "Отправка..." : "Отправить ссылку для восстановления"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail("");
                      setResetSuccess(false);
                      setResetError(null);
                    }}
                    className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    Назад
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
          Нет аккаунта?{" "}
          <Link
            href="/register"
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            Регистрация
          </Link>
        </p>
      </div>
    </div>
  );
}
