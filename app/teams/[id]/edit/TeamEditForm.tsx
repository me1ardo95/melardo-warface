"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import type { Team } from "@/lib/types";

type FormData = {
  logo_url: string;
  city: string;
  description: string;
};

type Props = { team: Team };

export default function TeamEditForm({ team }: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      logo_url: team.logo_url ?? "",
      city: team.city ?? "",
      description: team.description ?? "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    try {
      const logoUrl = data.logo_url?.trim() || null;
      const res = await fetch("/api/team/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: team.id,
          logo_url: logoUrl,
          city: data.city.trim() || null,
          description: data.description.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(json?.error ?? "Не удалось сохранить изменения");
        return;
      }
      router.push(`/teams/${team.id}`);
      router.refresh();
    } catch {
      setSubmitError("Ошибка сети. Попробуйте позже.");
    }
  };

  const inputClass =
    "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100";

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h1 className="text-xl font-semibold">Редактирование команды</h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        Измените логотип, описание и город команды.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="logo_url"
            className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            URL логотипа
          </label>
          <input
            id="logo_url"
            type="url"
            placeholder="https://..."
            className={inputClass}
            {...register("logo_url")}
          />
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Укажите ссылку на изображение или оставьте пустым.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Загрузить логотип (файл)
          </label>
          <input
            ref={logoFileRef}
            type="file"
            accept="image/*"
            className="block w-full text-sm text-neutral-500 file:mr-4 file:rounded-md file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200 dark:file:bg-neutral-700 dark:file:text-neutral-200 dark:hover:file:bg-neutral-600"
          />
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Загрузка в облако будет добавлена позже.
          </p>
        </div>
        <div>
          <label
            htmlFor="city"
            className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Город
          </label>
          <input
            id="city"
            type="text"
            placeholder="Москва, Санкт-Петербург..."
            className={inputClass}
            {...register("city")}
          />
        </div>
        <div>
          <label
            htmlFor="description"
            className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Описание
          </label>
          <textarea
            id="description"
            rows={4}
            placeholder="Краткое описание команды..."
            className={`${inputClass} resize-y`}
            {...register("description")}
          />
        </div>
        {submitError && (
          <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
        )}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-neutral-900"
          >
            {isSubmitting ? "Сохранение…" : "Сохранить"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
