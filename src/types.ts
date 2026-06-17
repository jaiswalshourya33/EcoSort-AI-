export interface ClassificationResult {
  itemName: string;
  category: "Dry Waste" | "Wet Waste" | "E-Waste" | "Hazardous" | string;
  confidenceScore: number;
  ecoImpactScore: number;
  recommendation: string;
  sustainabilityTip: string;
}

export interface DashboardStats {
  wasteClassified: number;
  recyclableItems: number;
  tonsDiverted: number;
  carbonReduced: number;
}

export interface GuideCategory {
  title: string;
  icon: string;
  description: string;
  examples: string[];
  tips: string[];
  colorClass: string;
  badgeClass: string;
}
