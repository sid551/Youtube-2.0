import { Crown, Zap, Star } from "lucide-react";

export type PlanId = "free" | "premium" | "pro";

export interface Plan {
  id: PlanId;
  label: string;
  price: string;
  priceNote: string;
  downloads: string;
  quality: string;
  ads: boolean;
  color: string;
  highlight: boolean;
  icon: any;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "free",
    label: "Free",
    price: "₹0",
    priceNote: "forever",
    downloads: "1 download / day",
    quality: "SD (480p)",
    ads: true,
    color: "border-gray-200",
    highlight: false,
    icon: Star,
    features: [
      "1 download per day",
      "SD quality (480p)",
      "Ads supported",
      "Basic video access",
    ],
  },
  {
    id: "premium",
    label: "Premium",
    price: "₹99",
    priceNote: "per month",
    downloads: "5 downloads / day",
    quality: "HD (1080p)",
    ads: false,
    color: "border-blue-500",
    highlight: true,
    icon: Crown,
    features: [
      "5 downloads per day",
      "HD quality (1080p)",
      "No ads",
      "Background play",
      "Offline viewing",
    ],
  },
  {
    id: "pro",
    label: "Pro",
    price: "₹199",
    priceNote: "per month",
    downloads: "Unlimited downloads",
    quality: "4K Ultra HD",
    ads: false,
    color: "border-purple-500",
    highlight: false,
    icon: Zap,
    features: [
      "Unlimited downloads",
      "4K Ultra HD quality",
      "No ads",
      "Background play",
      "Offline viewing",
      "Early access to features",
      "Priority support",
    ],
  },
];
