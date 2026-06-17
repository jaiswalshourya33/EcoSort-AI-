import { useState } from "react";
import { type GuideCategory } from "../types";
import { ArrowRight, Recycle, Leaf, Cpu, ShieldAlert, X } from "lucide-react";

export default function EcoGuide() {
  const [activeCategory, setActiveCategory] = useState<GuideCategory | null>(null);

  const categories: GuideCategory[] = [
    {
      title: "Dry Waste",
      icon: "recycling",
      description: "Recyclable and inorganic clean packaging materials.",
      examples: ["Plastic bottles", "Flattened cardboard boxes", "Aluminum cans", "Clean glass jars", "Magazines & paper products"],
      tips: [
        "Rinse and dry food and beverage packaging thoroughly before throwing.",
        "Remove caps from bottles and place them in secondary recycling or discard.",
        "Avoid shredding paper to retain longer fibers for multiple recycling cycles."
      ],
      colorClass: "hover:bg-emerald-500/5 group-hover:border-emerald-500 dark:hover:bg-emerald-950/10",
      badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-500/20"
    },
    {
      title: "Wet Waste",
      icon: "compost",
      description: "Biodegradable, organic scraps ready for composting loops.",
      examples: ["Fruits & vegetable peels", "Coffee grounds & tea leaves", "Leftover organic foods", "Eggshells", "Dry flowers & garden twigs"],
      tips: [
        "Compost wet waste at home to build organic and nutrient-rich soil.",
        "Never bundle organic items in conventional plastic bags; compost loose.",
        "Keep dairy and meats out of standard urban home compost piles to avoid pests."
      ],
      colorClass: "hover:bg-teal-500/5 group-hover:border-teal-500 dark:hover:bg-teal-950/10",
      badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border-teal-500/20"
    },
    {
      title: "E-Waste",
      icon: "devices_other",
      description: "Electronic devices, circuit boards, and internal arrays.",
      examples: ["Spent alkaline batteries", "Shattered smartphone screens", "Old charging wires", "Obsolete computer accessories", "Circuit boards"],
      tips: [
        "Never discard any e-waste in standard municipal trash collectors.",
        "Tape over terminal blocks on lithium-ion batteries to prevent short-circuits during transit.",
        "Find a dedicated manufacturer recycling drop-off bin or local eco-depot."
      ],
      colorClass: "hover:bg-cyan-500/5 group-hover:border-cyan-500 dark:hover:bg-cyan-950/10",
      badgeClass: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-500/20"
    },
    {
      title: "Hazardous",
      icon: "dangerous",
      description: "Bio-hazardous, chemical, toxic, or medical substances.",
      examples: ["Medical syringes & prescription drugs", "Industrial paint & thinners", "Bleach & home detergents", "Pesticides", "Motor fuel residues"],
      tips: [
        "Keep all hazardous substances inside their secure original sealed jars.",
        "Dispose of syringes safely inside punctured-resistance collection boxes.",
        "Coordinate with your city's hazardous waste program schedule for proper incineration."
      ],
      colorClass: "hover:bg-red-500/5 group-hover:border-red-500 dark:hover:bg-red-950/10",
      badgeClass: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-500/20"
    }
  ];

  const getLucideIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case "recycling":
        return <Recycle className={className} />;
      case "compost":
        return <Leaf className={className} />;
      case "devices_other":
        return <Cpu className={className} />;
      case "dangerous":
        return <ShieldAlert className={className} />;
      default:
        return <Recycle className={className} />;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto" id="education">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-on-surface dark:text-white tracking-tight mb-2">
            Eco-Guide Companion
          </h2>
          <p className="text-on-surface-variant dark:text-emerald-100/60 max-w-xl text-sm font-light">
            Understanding waste stream categories is the foundation for an effortless circular economy. Explore guidelines below.
          </p>
        </div>
        <button
          onClick={() => setActiveCategory(categories[0])}
          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-semibold text-sm flex items-center gap-1.5 group transition-colors"
          id="btn-view-quick-guide"
        >
          Quick Guidelines
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((cat, idx) => (
          <div
            key={idx}
            onClick={() => setActiveCategory(cat)}
            className={`glass-card p-6 rounded-2xl group transition-all duration-300 cursor-pointer border border-emerald-500/10 dark:border-emerald-400/10 hover:shadow-md hover:-translate-y-1 select-none flex flex-col justify-between ${cat.colorClass}`}
            id={`guide-card-${idx}`}
          >
            <div>
              <div className="mb-4 text-emerald-600 dark:text-emerald-400">
                {getLucideIcon(cat.icon, "w-8 h-8 group-hover:rotate-12 transition-transform duration-300")}
              </div>
              <h3 className="font-display text-lg font-bold text-on-surface dark:text-white mb-2">
                {cat.title}
              </h3>
              <p className="text-xs text-on-surface-variant dark:text-emerald-100/60 leading-relaxed font-light">
                {cat.description}
              </p>
            </div>
            
            <div className="mt-4 pt-4 border-t border-emerald-500/5 flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-wider uppercase text-emerald-600 dark:text-emerald-400 font-bold">
                Learn guidelines
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      {activeCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in animate-duration-300">
          <div className="relative w-full max-w-lg glass-card p-6 md:p-8 rounded-2xl border border-emerald-400/20 max-h-[90vh] overflow-y-auto animate-float-up">
            <button
              onClick={() => setActiveCategory(null)}
              className="absolute top-4 right-4 text-on-surface-variant dark:text-emerald-100/60 hover:text-red-500 transition-colors p-1"
              id="close-guide-modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="text-emerald-600 dark:text-emerald-400">
                {getLucideIcon(activeCategory.icon, "w-8 h-8")}
              </div>
              <div>
                <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-wider ${activeCategory.badgeClass}`}>
                  System Guide
                </span>
                <h3 className="font-display text-xl font-bold text-on-surface dark:text-white">
                  {activeCategory.title}
                </h3>
              </div>
            </div>

            <p className="text-sm text-on-surface-variant dark:text-emerald-100/80 mb-6 font-light">
              {activeCategory.description}
            </p>

            <div className="mb-6">
              <h4 className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-2.5">
                Stream Examples
              </h4>
              <div className="flex flex-wrap gap-2">
                {activeCategory.examples.map((ex, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-500/5"
                  >
                    {ex}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-2.5">
                Critical Sorting Advice & Tips
              </h4>
              <ul className="space-y-3">
                {activeCategory.tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 items-start text-xs text-on-surface-variant dark:text-emerald-100/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-emerald-500/10 flex justify-end">
              <button
                onClick={() => setActiveCategory(null)}
                className="bg-primary hover:bg-primary-container text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
                id="btn-confirm-guide-modal"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
