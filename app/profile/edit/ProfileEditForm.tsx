"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useMemo, useState, useRef } from "react";
import {
  WARFACE_NICK_REGEX,
  WARFACE_NICK_MIN,
  WARFACE_NICK_MAX,
  WARFACE_NICK_FORMAT_ERROR,
  WARFACE_NICK_LENGTH_ERROR,
} from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";

const AVATAR_BUCKET = process.env.NEXT_PUBLIC_AVATAR_BUCKET ?? "avatars";

type FormData = {
  warface_nick: string;
  rank: number;
};

type Props = {
  warfaceNick: string | null;
  rank: number | null;
};

export default function ProfileEditForm({ warfaceNick, rank: initialRank }: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      warface_nick: warfaceNick ?? "",
      rank: initialRank ?? 1,
    },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    try {
      let avatarUrl: string | undefined;
      const file = avatarFileRef.current?.files?.[0];

      if (file) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setSubmitError("Необходима авторизация.");
          return;
        }

        // Публичная ссылка для рендера на странице профиля и в сайдбаре.
        const filePath = `avatars/${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          setSubmitError(
            `Ошибка загрузки аватара: ${uploadError.message || "неизвестная"}.`
          );
          return;
        }

        avatarUrl = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath).data.publicUrl;
      }

      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warface_nick: data.warface_nick.trim(),
          avatar_url: avatarUrl || undefined,
          rank: data.rank,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(json?.error ?? "Не удалось сохранить изменения");
        return;
      }
      router.replace("/profile");
      router.refresh();
    } catch {
      setSubmitError("Ошибка сети. Попробуйте позже.");
    }
  };

  const inputClass =
    "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100";
  const errorInputClass = "border-red-500 dark:border-red-500";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
      <div>
        <label
          htmlFor="warface_nick"
          className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Ник в Warface <span className="text-red-500">*</span>
        </label>
        <input
          id="warface_nick"
          type="text"
          placeholder="Никнейм в игре — по нему добавляют в команду"
          className={`${inputClass} ${errors.warface_nick ? errorInputClass : ""}`}
          {...register("warface_nick", {
            required: "Укажите ник в Warface",
            minLength: {
              value: WARFACE_NICK_MIN,
              message: WARFACE_NICK_LENGTH_ERROR,
            },
            maxLength: {
              value: WARFACE_NICK_MAX,
              message: WARFACE_NICK_LENGTH_ERROR,
            },
            pattern: {
              value: WARFACE_NICK_REGEX,
              message: WARFACE_NICK_FORMAT_ERROR,
            },
          })}
        />
        {errors.warface_nick && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.warface_nick.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="rank"
          className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Ранг в Warface
        </label>
        <input
          id="rank"
          type="number"
          min={1}
          max={1000}
          className={inputClass}
          {...register("rank", {
            valueAsNumber: true,
            min: { value: 1, message: "Ранг от 1 до 1000" },
            max: { value: 1000, message: "Ранг от 1 до 1000" },
          })}
        />
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Минимум 26 — для матчей, 55 — для турниров
        </p>
        {errors.rank && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.rank.message}
          </p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Аватар
        </label>
        <input
          ref={avatarFileRef}
          type="file"
          accept="image/*"
          className="block w-full text-sm text-neutral-500 file:mr-4 file:rounded-md file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200 dark:file:bg-neutral-700 dark:file:text-neutral-200 dark:hover:file:bg-neutral-600"
        />
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Аватар будет сохранён после загрузки файла.
        </p>
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
          {isSubmitting ? "Сохранение…" : "Сохранить изменения"}
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
  );
}
