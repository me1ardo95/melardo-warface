"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import {
  WARFACE_NICK_REGEX,
  WARFACE_NICK_MIN,
  WARFACE_NICK_MAX,
  WARFACE_NICK_FORMAT_ERROR,
  WARFACE_NICK_LENGTH_ERROR,
} from "@/lib/validation";

export default function RegisterPage() {
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [state, formAction] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await signUp(formData);
      return result?.error ? { error: result.error } : null;
    },
    null
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-xl font-semibold">Регистрация</h1>
        <form
          action={formAction}
          className="space-y-4"
          onSubmit={(e) => {
            if (!acceptedRules) {
              e.preventDefault();
              setRulesError("Вы должны принять правила платформы.");
            } else {
              setRulesError(null);
            }
          }}
        >
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
              htmlFor="displayName"
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Имя
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              autoComplete="nickname"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              placeholder="Как вас называть на платформе"
              suppressHydrationWarning
            />
          </div>
          <div>
            <label
              htmlFor="warfaceNick"
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Ник в Warface <span className="text-red-500">*</span>
            </label>
            <input
              id="warfaceNick"
              name="warfaceNick"
              type="text"
              required
              minLength={WARFACE_NICK_MIN}
              maxLength={WARFACE_NICK_MAX}
              pattern={WARFACE_NICK_REGEX.source}
              title={WARFACE_NICK_FORMAT_ERROR}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              placeholder="Только русские буквы, цифры, _ - . (3–16 символов)"
              suppressHydrationWarning
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {WARFACE_NICK_LENGTH_ERROR}. {WARFACE_NICK_FORMAT_ERROR}
            </p>
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
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 pr-10 text-neutral-900 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                placeholder="Не менее 6 символов"
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
          <div>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={acceptedRules}
                onChange={(e) => {
                  setAcceptedRules(e.target.checked);
                  if (rulesError) setRulesError(null);
                }}
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800"
              />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                Я принимаю{" "}
                <Link
                  href="/rules"
                  className="text-blue-600 underline hover:text-blue-500 dark:text-blue-400"
                >
                  правила платформы
                </Link>
              </span>
            </label>
            {rulesError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {rulesError}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
          >
            Создать аккаунт
          </button>
        </form>
        <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
          Уже есть аккаунт?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            Вход
          </Link>
        </p>
      </div>
    </div>
  );
}
