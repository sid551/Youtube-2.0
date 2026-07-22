import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import VideoCard from "@/components/videocard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SubscriptionsPage() {
  const { user } = useUser();
  const [channels, setChannels] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user?._id) {
      setLoading(false);
      return;
    }

    const fetchSubscriptions = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/user/subscriptions/${user._id}`);
        setChannels(res.data.channels || []);
        setVideos(res.data.videos || []);
      } catch (error) {
        console.error("Error fetching subscriptions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, [user?._id]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <UserCheck className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Don't miss new videos
        </h2>
        <p className="text-gray-600 max-w-md mb-6">
          Sign in to see updates from your favorite YouTube channels
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading subscriptions...
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Subscriptions</h1>

        {/* Subscribed Channels Bar */}
        {channels.length > 0 ? (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Subscribed Channels ({channels.length})
            </h2>
            <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
              {channels.map((channel) => (
                <Link
                  key={channel._id}
                  href={`/channel/${channel._id}`}
                  className="flex flex-col items-center gap-1 min-w-[72px] group"
                >
                  <Avatar className="w-14 h-14 border group-hover:scale-105 transition-transform">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-bold">
                      {channel.channelname?.[0] || channel.name?.[0] || "C"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-gray-700 font-medium truncate max-w-[80px] group-hover:text-blue-600">
                    {channel.channelname || channel.name || "Channel"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center bg-gray-50 rounded-xl border p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              No Subscriptions Yet
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Subscribe to channels to see their latest uploaded videos here.
            </p>
            <Link href="/explore">
              <Button variant="default">Explore Content</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Videos Stream */}
      {channels.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Latest Videos from Subscribed Channels
          </h2>
          {videos.length === 0 ? (
            <p className="text-gray-500 italic py-8 text-center">
              The channels you subscribed to haven't uploaded any videos yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {videos.map((video) => (
                <VideoCard key={video._id} video={video} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
