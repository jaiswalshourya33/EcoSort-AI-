import { type DashboardStats as StatsType } from "../types";
import { CheckSquare, Recycle, Trash2, ShieldAlert } from "lucide-react";

interface DashboardStatsProps {
  stats: StatsType;
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const statItems = [
    {
      title: "WASTE CLASSIFIED",
      value: stats.wasteClassified.toLocaleString(),
      description: "Organic streams analysed",
      icon: <CheckSquare className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />,
      bg: "bg-emerald-50 dark:bg-emerald-950/20"
    },
    {
      title: "RECYCLABLE ITEMS",
      value: stats.recyclableItems.toLocaleString(),
      description: "Diverted to circular loops",
      icon: <Recycle className="w-6 h-6 text-emerald-600 dark:text-emerald-300" />,
      bg: "bg-teal-50 dark:bg-teal-950/20"
    },
    {
      title: "TONS DIVERTED",
      value: stats.tonsDiverted.toFixed(3),
      description: "Saved from incinerators",
      icon: <Trash2 className="w-6 h-6 text-green-600 dark:text-green-300" />,
      bg: "bg-green-50 dark:bg-green-950/20"
    },
    {
      title: "CARBON REDUCED (KG)",
      value: stats.carbonReduced.toLocaleString(),
      description: "Preserved CO2 offset",
      icon: <ShieldAlert className="w-6 h-6 text-emerald-700 dark:text-emerald-200" />,
      bg: "bg-emerald-100/40 dark:bg-emerald-950/40"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl mx-auto">
      {statItems.map((item, index) => (
        <div
          key={index}
          className="glass-card p-6 rounded-2xl flex flex-col items-center text-center group transition-all duration-300 hover:-translate-y-1.5 border border-emerald-500/10 dark:border-emerald-400/10 hover:border-emerald-500/30"
          id={`dev-stat-item-${index}`}
        >
          <div className={`w-12 h-12 rounded-full ${item.bg} flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300`}>
            {item.icon}
          </div>
          <div className="text-3xl font-bold font-display text-on-surface dark:text-white mb-1 tracking-tight">
            {item.value}
          </div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-bold mb-1">
            {item.title}
          </p>
          <p className="text-xs text-on-surface-variant dark:text-emerald-100/60 font-light">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
}
