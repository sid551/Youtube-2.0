import { useState, useEffect, useCallback } from "react";
import { Check, Crown, Zap, Star, Medal } from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { type PlanId, PLANS, TABLE_ROWS } from "@/lib/plans";
import { formatDistanceToNow } from "date-fns";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PLAN_ICONS: Record<PlanId, any> = {
  free: Star,
  bronze: Medal,
  silver: Crown,
  gold: Zap,
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) return resolve(true);
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

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

  const handleDowngrade = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await axiosInstance.patch(`/user/plan/${user._id}`, {
        plan: "free",
      });
      login({ ...user, plan: res.data.plan, planExpiresAt: null });
      setCurrentPlan("free");
      setPlanExpiresAt(null);
      toast.success("Switched to Free plan");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, login]);

  const handleUpgrade = useCallback(
    async (planId: PlanId) => {
      if (!user) {
        toast.error("Sign in to subscribe");
        return;
      }
      if (planId === currentPlan) return;
      if (planId === "free") {
        handleDowngrade();
        return;
      }
      setLoading(true);
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Could not load payment SDK. Check your connection.");
        setLoading(false);
        return;
      }
      try {
        const { data } = await axiosInstance.post("/user/subscription/order", {
          plan: planId,
          userId: user._id,
        });
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: data.amount,
          currency: data.currency,
          name: "YourTube",
          description: `${
            planId.charAt(0).toUpperCase() + planId.slice(1)
          } Plan - 30 days`,
          order_id: data.orderId,
          prefill: { name: user.name || "", email: user.email || "" },
          theme: { color: "#dc2626" },
          method: {
            upi: true,
            card: true,
            netbanking: true,
            wallet: true,
          },
          handler: async (response: any) => {
            try {
              const verifyRes = await axiosInstance.post(
                "/user/subscription/verify",
                {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  plan: planId,
                  userId: user._id,
                }
              );
              login({
                ...user,
                plan: verifyRes.data.plan,
                planStartDate: verifyRes.data.planStartDate,
                planExpiresAt: verifyRes.data.planExpiresAt,
              });
              setCurrentPlan(verifyRes.data.plan as PlanId);
              setPlanExpiresAt(verifyRes.data.planExpiresAt);
              toast.success(
                `Upgraded to ${planId} plan! Invoice sent to your email.`
              );
            } catch {
              toast.error("Payment verification failed. Contact support.");
            } finally {
              setLoading(false);
            }
          },
          modal: { ondismiss: () => setLoading(false) },
        };
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response: any) => {
          toast.error(`Payment failed: ${response.error.description}`);
          setLoading(false);
        });
        rzp.open();
      } catch {
        toast.error("Could not initiate payment. Please try again.");
        setLoading(false);
      }
    },
    [user, currentPlan, login, handleDowngrade]
  );

  return (
    <main className="flex-1 p-4 sm:p-8 bg-white">
      <div className="max-w-5xl mx-auto">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const Icon = PLAN_ICONS[plan.id];
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
                className="relative rounded-2xl p-5 flex flex-col gap-4"
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
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 shrink-0" style={checkStyle} />
                  <span className="text-base font-semibold" style={titleStyle}>
                    {plan.label}
                  </span>
                  {isCurrent && (
                    <span
                      className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: plan.badgeActiveBg,
                        color: plan.badgeActiveText,
                      }}
                    >
                      Current
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold" style={titleStyle}>
                    {plan.priceDisplay}
                  </span>
                  <span className="text-sm" style={subStyle}>
                    / {plan.priceNote}
                  </span>
                </div>
                <ul className="space-y-2 flex-1">
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
                <button
                  disabled={isCurrent || loading || !user}
                  onClick={() => handleUpgrade(plan.id)}
                  className="mt-1 w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
                  style={btnStyle}
                >
                  {loading && !isCurrent
                    ? "Processing..."
                    : isCurrent
                    ? "Current plan"
                    : plan.id === "free"
                    ? "Downgrade to Free"
                    : `Get ${plan.label}`}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-14">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
            Plan comparison
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 w-1/5">
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
                          <span className="text-gray-300">-</span>
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
