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
      <div className="relative h-32 md:h-48 lg:h-64 bg-gradient-to-r from-blue-400 to-purple-500 overflow-hidden" />

      <div className="px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <Avatar className="w-20 h-20 md:w-32 md:h-32">
            <AvatarFallback className="text-2xl">
              {channel?.channelname?.[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <h1 className="text-2xl md:text-4xl font-bold">
              {channel?.channelname}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span>
                @{channel?.channelname?.toLowerCase().replace(/\s+/g, "")}
              </span>
              <span>{fmt(subscriberCount)} subscribers</span>
            </div>
            {channel?.description && (
              <p className="text-sm text-gray-700 max-w-2xl">
                {channel.description}
              </p>
            )}
          </div>

          {user?._id !== channel?._id && (
            <Button
              onClick={handleSubscribe}
              disabled={loading}
              className={
                isSubscribed
                  ? "bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
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
