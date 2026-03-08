"use client";

import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import {
  TEAM_NAME_REGEX,
  TEAM_NAME_MIN,
  TEAM_NAME_MAX,
  TEAM_NAME_FORMAT_ERROR,
  TEAM_NAME_LENGTH_ERROR,
  TEAM_NAME_BANNED_ERROR,
  containsBannedWords,
} from "@/lib/validation";

type FormData = {
  name: string;
  city: string;
  description: string;
};

export default function CreateTeamForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      city: "",
      description: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    try {
      const logoUrl = "";
      const res = await fetch("/api/team/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          city: data.city.trim() || undefined,
          logo: logoUrl || undefined,
          description: data.description.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(json?.error ?? "Не удалось создать команду");
        return;
      }
      router.push(`/teams/${json.id}`);
    } catch {
      setSubmitError("Ошибка сети. Попробуйте позже.");
    }
  };

  const inputClass =
    "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100";
  const errorInputClass = "border-red-500 dark:border-red-500";

  return (
    <div className="mx-auto max-w-xl rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h1 className="text-xl font-semibold">Создание команды</h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        Заполните данные команды. Создатель автоматически становится капитаном
        и получает права на управление составом. После создания вы будете
        перенаправлены на страницу команды.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="name"
            className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Название команды <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            placeholder="Например: Вулканы"
            className={`${inputClass} ${errors.name ? errorInputClass : ""}`}
            {...register("name", {
              required: "Введите название команды",
              minLength: {
                value: TEAM_NAME_MIN,
                message: TEAM_NAME_LENGTH_ERROR,
              },
              maxLength: {
                value: TEAM_NAME_MAX,
                message: TEAM_NAME_LENGTH_ERROR,
              },
              pattern: {
                value: TEAM_NAME_REGEX,
                message: TEAM_NAME_FORMAT_ERROR,
              },
              validate: (v) =>
                !containsBannedWords(v?.trim() ?? "") || TEAM_NAME_BANNED_ERROR,
            })}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.name.message}
            </p>
          )}
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
            placeholder="Москва, Санкт-Петербург и т.п."
            className={inputClass}
            {...register("city")}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Логотип
          </label>
          <input
            ref={logoFileRef}
            type="file"
            accept="image/*"
            className="block w-full text-sm text-neutral-500 file:mr-4 file:rounded-md file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200 dark:file:bg-neutral-700 dark:file:text-neutral-200 dark:hover:file:bg-neutral-600"
          />
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Загрузка в облако будет добавлена позже. Сейчас выбор файла не
            сохраняется.
          </p>
        </div>
        <div>
          <label
            htmlFor="description"
            className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Описание команды
          </label>
          <textarea
            id="description"
            rows={4}
            placeholder="Краткое описание команды, достижения, контакты..."
            className={`${inputClass} resize-y`}
            {...register("description")}
          />
        </div>
        {submitError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {submitError}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-neutral-900"
        >
          {isSubmitting ? "Создание…" : "Создать команду"}
        </button>
      </form>
    </div>
  );
}
