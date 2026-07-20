import { useEffect } from "react";
import { useRouter } from "next/router";

// /subscriptions redirects to /plans — channel subscriptions are a future feature
export default function SubscriptionsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/plans");
  }, []);
  return null;
}
