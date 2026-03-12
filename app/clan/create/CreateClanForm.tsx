"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClan } from "@/app/actions/clans";

export default function CreateClanForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await createClan(formData);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/clans");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface space-y-4 rounded-xl p-6">
      {error && (
        <div className="rounded-lg border border-[#ef4444]/50 bg-[#ef4444]/10 px-4 py-2 text-sm text-[#ef4444]">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="name" className="mb-1 block text-sm text-[#9CA3AF]">
          Название клана
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={50}
          className="w-full rounded-lg border border-[#2A2F3A] bg-[#0A0C0F] px-4 py-2 text-white focus:border-[#F97316] focus:outline-none"
          placeholder="Например: Warface Legends"
        />
      </div>
      <div>
        <label htmlFor="tag" className="mb-1 block text-sm text-[#9CA3AF]">
          Тег (2–5 символов, латиница/цифры)
        </label>
        <input
          id="tag"
          name="tag"
          type="text"
          required
          minLength={2}
          maxLength={5}
          className="w-full rounded-lg border border-[#2A2F3A] bg-[#0A0C0F] px-4 py-2 font-mono text-white placeholder:uppercase focus:border-[#F97316] focus:outline-none"
          placeholder="WFLEG"
          style={{ textTransform: "uppercase" }}
        />
      </div>
      <div>
        <label htmlFor="description" className="mb-1 block text-sm text-[#9CA3AF]">
          Описание (необязательно)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={500}
          className="w-full rounded-lg border border-[#2A2F3A] bg-[#0A0C0F] px-4 py-2 text-white focus:border-[#F97316] focus:outline-none"
          placeholder="Кратко о клане"
        />
      </div>
      <div>
        <label htmlFor="logo_url" className="mb-1 block text-sm text-[#9CA3AF]">
          URL логотипа (необязательно)
        </label>
        <input
          id="logo_url"
          name="logo_url"
          type="url"
          className="w-full rounded-lg border border-[#2A2F3A] bg-[#0A0C0F] px-4 py-2 text-white focus:border-[#F97316] focus:outline-none"
          placeholder="https://..."
        />
      </div>
      <button type="submit" className="btn-primary w-full">
        Создать клан
      </button>
    </form>
  );
}
