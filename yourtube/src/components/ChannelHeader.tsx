import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { toast } from "sonner";
import axiosInstance from "@/lib/axiosinstance";

const ChannelHeader = ({ channel, user }: any) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!channel?._id || channel._id === "undefined") return;
    const fetchStatus = async () => {
      try {
        const res = await axiosInstance.get(
          `/user/subscribe/status/${channel._id}${
            user ? `?userId=${user._id}` : ""
          }`
        );
        setIsSubscribed(res.data.subscribed);
        setSubscriberCount(res.data.subscriberCount);
      } catch {
        // silently fail
      }
    };
    fetchStatus();
  }, [channel?._id, user?._id]);

  const handleSubscribe = async () => {
    if (!user) {
      toast.error("Sign in to subscribe");
      return;
    }
    if (!channel?._id || channel._id === "undefined") {
      toast.error("Channel information unavailable");
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.post(`/user/subscribe/${channel._id}`, {
        userId: user._id,
      });
      setIsSubscribed(res.data.subscribed);
      setSubscriberCount(res.data.subscriberCount);
      toast.success(res.data.subscribed ? "Subscribed!" : "Unsubscribed");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="w-full">
      <div className="relative h-28 sm:h-40 md:h-52 lg:h-64 bg-gradient-to-r from-red-600 via-purple-600 to-indigo-600 overflow-hidden shadow-inner" />

      <div className="px-3 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
          <Avatar className="w-16 h-16 sm:w-24 sm:h-24 md:w-28 md:h-28 border-4 border-white dark:border-zinc-900 shadow-md -mt-10 sm:-mt-12 shrink-0">
            <AvatarFallback className="text-xl sm:text-3xl font-bold bg-zinc-800 text-white">
              {channel?.channelname?.[0] || "C"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-1 sm:space-y-2 min-w-0 w-full">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate text-gray-900 dark:text-gray-100">
              {channel?.channelname}
            </h1>
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">
                @{channel?.channelname?.toLowerCase().replace(/\s+/g, "")}
              </span>
              <span>•</span>
              <span>{fmt(subscriberCount)} subscribers</span>
            </div>
            {channel?.description && (
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 max-w-2xl line-clamp-2 sm:line-clamp-none mt-1">
                {channel.description}
              </p>
            )}
          </div>

          {user?._id !== channel?._id && (
            <Button
              onClick={handleSubscribe}
              disabled={loading}
              className={`w-full sm:w-auto shrink-0 rounded-full font-medium ${
                isSubscribed
                  ? "bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300 dark:bg-zinc-800 dark:text-gray-200 dark:border-zinc-700"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              {isSubscribed ? "Subscribed" : "Subscribe"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelHeader;

