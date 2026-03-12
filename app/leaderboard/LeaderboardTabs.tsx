"use client";

import Link from "next/link";

type Props = { currentTab: string; basePath?: string };

const TABS = [
  { key: "players", label: "ТОП 100 игроков" },
  { key: "teams", label: "ТОП команд" },
  { key: "week", label: "ТОП недели" },
  { key: "month", label: "ТОП месяца" },
] as const;

export default function LeaderboardTabs({ currentTab, basePath = "/leaderboard" }: Props) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-[#2A2F3A]">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={currentTab === tab.key ? "#" : `${basePath}?tab=${tab.key}`}
          className={`rounded-t-md px-4 py-2 text-sm font-medium ${
            currentTab === tab.key
              ? "border-b-2 border-[#F97316] text-[#F97316]"
              : "text-[#9CA3AF] hover:text-white"
          } ${currentTab === tab.key ? "pointer-events-none" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
