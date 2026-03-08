import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Поддержка | MELARDO WARFACE",
  description:
    "Связь с администрацией MELARDO WARFACE: контакты, срочная помощь, форма обратной связи и донаты.",
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
