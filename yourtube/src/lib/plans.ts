export type PlanId = "free" | "bronze" | "silver" | "gold";

export interface PlanFeatures {
  id: PlanId;
  label: string;
  price: number;
  priceDisplay: string;
  priceNote: string;
  downloads: string;
  quality: string;
  ads: boolean;
  highlight: boolean;
  accentColor: string;
  activeCardBg: string;
  activeBorder: string;
  activeText: string;
  activeSub: string;
  btnActiveBg: string;
  btnActiveText: string;
  btnInactiveBg: string;
  btnInactiveText: string;
  badgeActiveBg: string;
  badgeActiveText: string;
  features: string[];
}

export const PLANS: PlanFeatures[] = [
  {
    id: "free",
    label: "Free",
    price: 0,
    priceDisplay: "₹0",
    priceNote: "forever",
    downloads: "1 download / day",
    quality: "SD (480p)",
    ads: true,
    highlight: false,
    accentColor: "#374151",
    activeCardBg: "#f9fafb",
    activeBorder: "#9ca3af",
    activeText: "#111827",
    activeSub: "#6b7280",
    btnActiveBg: "#e5e7eb",
    btnActiveText: "#374151",
    btnInactiveBg: "#111827",
    btnInactiveText: "#ffffff",
    badgeActiveBg: "#d1d5db",
    badgeActiveText: "#374151",
    features: [
      "1 download per day",
      "SD quality (480p)",
      "Ads supported",
      "Basic video access",
    ],
  },
  {
    id: "bronze",
    label: "Bronze",
    price: 49,
    priceDisplay: "₹49",
    priceNote: "per month",
    downloads: "5 downloads / day",
    quality: "HD (720p)",
    ads: true,
    highlight: false,
    accentColor: "#b45309",
    activeCardBg: "#92400e",
    activeBorder: "#92400e",
    activeText: "#ffffff",
    activeSub: "#fde68a",
    btnActiveBg: "#ffffff",
    btnActiveText: "#92400e",
    btnInactiveBg: "#b45309",
    btnInactiveText: "#ffffff",
    badgeActiveBg: "#78350f",
    badgeActiveText: "#fde68a",
    features: [
      "5 downloads per day",
      "HD quality (720p)",
      "Ads supported",
      "Watch history",
      "Watch later list",
    ],
  },
  {
    id: "silver",
    label: "Silver",
    price: 99,
    priceDisplay: "₹99",
    priceNote: "per month",
    downloads: "15 downloads / day",
    quality: "Full HD (1080p)",
    ads: false,
    highlight: true,
    accentColor: "#475569",
    activeCardBg: "#334155",
    activeBorder: "#334155",
    activeText: "#ffffff",
    activeSub: "#cbd5e1",
    btnActiveBg: "#ffffff",
    btnActiveText: "#334155",
    btnInactiveBg: "#475569",
    btnInactiveText: "#ffffff",
    badgeActiveBg: "#1e293b",
    badgeActiveText: "#e2e8f0",
    features: [
      "15 downloads per day",
      "Full HD quality (1080p)",
      "Ad-free viewing",
      "Background play",
      "Offline viewing",
    ],
  },
  {
    id: "gold",
    label: "Gold",
    price: 199,
    priceDisplay: "₹199",
    priceNote: "per month",
    downloads: "Unlimited",
    quality: "4K Ultra HD",
    ads: false,
    highlight: false,
    accentColor: "#d97706",
    activeCardBg: "#b45309",
    activeBorder: "#b45309",
    activeText: "#ffffff",
    activeSub: "#fef3c7",
    btnActiveBg: "#ffffff",
    btnActiveText: "#b45309",
    btnInactiveBg: "#d97706",
    btnInactiveText: "#ffffff",
    badgeActiveBg: "#78350f",
    badgeActiveText: "#fef3c7",
    features: [
      "Unlimited downloads",
      "4K Ultra HD quality",
      "Ad-free viewing",
      "Background play",
      "Offline viewing",
      "Early access to features",
      "Priority support",
    ],
  },
];

export const TABLE_ROWS = [
  { label: "Downloads / day", values: ["1", "5", "15", "Unlimited"] },
  { label: "Video quality", values: ["SD (480p)", "HD (720p)", "Full HD (1080p)", "4K Ultra HD"] },
  { label: "Ads", values: ["Yes", "Yes", "No", "No"] },
  { label: "Background play", values: ["No", "No", "Yes", "Yes"] },
  { label: "Offline viewing", values: ["No", "No", "Yes", "Yes"] },
  { label: "Early access", values: ["No", "No", "No", "Yes"] },
  { label: "Priority support", values: ["No", "No", "No", "Yes"] },
];
