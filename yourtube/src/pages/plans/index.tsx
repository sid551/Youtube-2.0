import { useState, useEffect } from "react";
import { Check, Crown, Zap, Star } from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { type PlanId } from "@/lib/plans";
import { formatDistanceToNow } from "date-fns";

type PlanCfg = {
  id: PlanId;
  label: string;
  price: string;
  priceNote: string;
  icon: any;
  features: string[];
  highlight: boolean;
  // colors used via inline style — immune to Tailwind purge
  accentColor: string; // border + btn bg when inactive
  activeCardBg: string;
  activeBorder: string;
  activeText: string; // text on active card
  activeSub: string;
  btnActiveBg: string;
  btnActiveText: string;
  btnInactiveBg: string;
  btnInactiveText: string;
  badgeActiveBg: string;
  badgeActiveText: string;
};

const PLANS: PlanCfg[] = [
  {
    id: "free",
    label: "Free",
    price: "₹0",
    priceNote: "forever",
    icon: Star,
    highlight: false,
    features: [
      "1 download per day",
      "SD quality (480p)",
      "Ads supported",
      "Basic video access",
    ],
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
  },
  {
    id: "premium",
    label: "Premium",
    price: "₹99",
    priceNote: "per month",
    icon: Crown,
    highlight: true,
    features: [
      "5 downloads per day",
      "HD quality (1080p)",
      "No ads",
      "Background play",
      "Offline viewing",
    ],
    accentColor: "#2563eb",
    activeCardBg: "#1d4ed8",
    activeBorder: "#1d4ed8",
    activeText: "#ffffff",
    activeSub: "#bfdbfe",
    btnActiveBg: "#ffffff",
    btnActiveText: "#1d4ed8",
    btnInactiveBg: "#2563eb",
    btnInactiveText: "#ffffff",
    badgeActiveBg: "#1e3a8a",
    badgeActiveText: "#ffffff",
  },
  {
    id: "pro",
    label: "Pro",
    price: "₹199",
    priceNote: "per month",
    icon: Zap,
    highlight: false,
    features: [
      "Unlimited downloads",
      "4K Ultra HD quality",
      "No ads",
      "Background play",
      "Offline viewing",
      "Early access to features",
      "Priority support",
    ],
    accentColor: "#7c3aed",
    activeCardBg: "#6d28d9",
    activeBorder: "#6d28d9",
    activeText: "#ffffff",
    activeSub: "#ede9fe",
    btnActiveBg: "#ffffff",
    btnActiveText: "#6d28d9",
    btnInactiveBg: "#7c3aed",
    btnInactiveText: "#ffffff",
    badgeActiveBg: "#4c1d95",
    badgeActiveText: "#ffffff",
  },
];

const TABLE_ROWS = [
  { label: "Downloads / day", values: ["1", "5", "Unlimited"] },
  {
    label: "Video quality",
    values: ["SD (480p)", "HD (1080p)", "4K Ultra HD"],
  },
  { label: "Ads", values: ["Yes", "No", "No"] },
  { label: "Background play", values: ["No", "Yes", "Yes"] },
  { label: "Offline viewing", values: ["No", "Yes", "Yes"] },
  { label: "Early access", values: ["No", "No", "Yes"] },
  { label: "Priority support", values: ["No", "No", "Yes"] },
];

export default function PlansPage() {
  const { user, login } = useUser();
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PlanId>("free");
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setCurrentPlan((user.plan as PlanId) || "free");
      setPlanExpiresAt(user.planExpiresAt || null);
    }
  }, [user]);

  const handleSelect = async (planId: PlanId) => {
    if (!user) {
      toast.error("Sign in to subscribe");
      return;
    }
    if (planId === currentPlan) return;
    setLoading(true);
    try {
      const res = await axiosInstance.patch(`/user/plan/${user._id}`, {
        plan: planId,
      });
      login({
        ...user,
        plan: res.data.plan,
        planExpiresAt: res.data.planExpiresAt,
      });
      setCurrentPlan(res.data.plan);
      setPlanExpiresAt(res.data.planExpiresAt);
      toast.success(
        planId === "free"
          ? "Switched to Free plan"
          : `Subscribed to ${planId} plan`
      );
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 p-4 sm:p-8 bg-white">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Choose your plan
          </h1>
          <p className="text-gray-500">
            Upgrade for more downloads, better quality, and an ad-free
            experience.
          </p>
          {user && currentPlan !== "free" && planExpiresAt && (
            <p className="text-sm text-blue-600 mt-2">
              Your {currentPlan} plan renews in{" "}
              {formatDistanceToNow(new Date(planExpiresAt))}.
            </p>
          )}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const Icon = plan.icon;

            const cardStyle: React.CSSProperties = isCurrent
              ? {
                  background: plan.activeCardBg,
                  borderColor: plan.activeBorder,
                  borderWidth: 2,
                  borderStyle: "solid",
                }
              : {
                  background: "#ffffff",
                  borderColor: plan.accentColor + "33",
                  borderWidth: 2,
                  borderStyle: "solid",
                };

            const titleStyle: React.CSSProperties = {
              color: isCurrent ? plan.activeText : "#111827",
            };
            const subStyle: React.CSSProperties = {
              color: isCurrent ? plan.activeSub : "#6b7280",
            };
            const featureStyle: React.CSSProperties = {
              color: isCurrent ? plan.activeText : "#374151",
            };
            const checkStyle: React.CSSProperties = {
              color: isCurrent ? plan.activeSub : "#22c55e",
            };
            const badgeStyle: React.CSSProperties = {
              background: plan.badgeActiveBg,
              color: plan.badgeActiveText,
            };
            const btnStyle: React.CSSProperties = isCurrent
              ? {
                  background: plan.btnActiveBg,
                  color: plan.btnActiveText,
                  opacity: 0.9,
                  cursor: "default",
                }
              : { background: plan.btnInactiveBg, color: plan.btnInactiveText };

            return (
              <div
                key={plan.id}
                className="relative rounded-2xl p-6 flex flex-col gap-5"
                style={cardStyle}
              >
                {plan.highlight && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap"
                    style={{ background: plan.accentColor, color: "#fff" }}
                  >
                    Most popular
                  </span>
                )}

                {/* Title */}
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 shrink-0" style={checkStyle} />
                  <span className="text-lg font-semibold" style={titleStyle}>
                    {plan.label}
                  </span>
                  {isCurrent && (
                    <span
                      className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={badgeStyle}
                    >
                      Current
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold" style={titleStyle}>
                    {plan.price}
                  </span>
                  <span className="text-sm" style={subStyle}>
                    / {plan.priceNote}
                  </span>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={checkStyle}
                      />
                      <span style={featureStyle}>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* Button */}
                <button
                  disabled={isCurrent || loading || !user}
                  onClick={() => handleSelect(plan.id)}
                  className="mt-2 w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity"
                  style={btnStyle}
                >
                  {isCurrent
                    ? "Current plan"
                    : plan.id === "free"
                    ? "Downgrade to Free"
                    : `Get ${plan.label}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Comparison table */}
        <div className="mt-14">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
            Plan comparison
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 w-1/3">
                    Feature
                  </th>
                  {PLANS.map((p) => (
                    <th
                      key={p.id}
                      className="py-3 px-4 text-center font-semibold"
                      style={{
                        color: currentPlan === p.id ? p.accentColor : "#374151",
                      }}
                    >
                      {p.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row, idx) => (
                  <tr
                    key={row.label}
                    style={{
                      background: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                    }}
                  >
                    <td className="py-3 px-4 font-medium text-gray-600">
                      {row.label}
                    </td>
                    {row.values.map((v, i) => (
                      <td key={i} className="py-3 px-4 text-center">
                        {v === "Yes" ? (
                          <Check className="w-4 h-4 text-green-500 mx-auto" />
                        ) : v === "No" ? (
                          <span className="text-gray-300">—</span>
                        ) : (
                          <span className="font-medium text-gray-800">{v}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {!user && (
          <p className="text-center text-sm text-gray-400 mt-8">
            Sign in to subscribe to a plan.
          </p>
        )}
      </div>
    </main>
  );
}
