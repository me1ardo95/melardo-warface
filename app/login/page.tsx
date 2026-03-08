"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
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
        <h1 className="text-xl font-semibold">Login</h1>
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
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              placeholder="you@example.com"
              suppressHydrationWarning
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              suppressHydrationWarning
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
          >
            Sign in
          </button>
        </form>
        <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
