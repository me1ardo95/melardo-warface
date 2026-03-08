import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Руководство пользователя | MELARDO WARFACE",
  description:
    "Пошаговое руководство по платформе MELARDO WARFACE: регистрация, профиль, команды, вызовы, турниры, рейтинги, донаты и жалобы.",
};

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
