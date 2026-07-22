import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const ChannelPage = () => {
  const router = useRouter();
  const { user } = useUser();

  const [channel, setChannel] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchedId, setFetchedId] = useState<string>("");

  useEffect(() => {
    // id comes from router.query — it is a string only after hydration
    const id = typeof router.query.id === "string" ? router.query.id : "";

    // Don't fetch if id isn't ready yet, or we already fetched for this id
    if (!id || id === fetchedId) return;

    setFetchedId(id);
    setLoading(true);
    setChannel(null);
    setVideos([]);

    const fetchChannel = async () => {
      try {
        const [channelRes, videosRes] = await Promise.all([
          axiosInstance.get(`/user/${id}`),
          axiosInstance.get("/video/getall"),
        ]);
        setChannel(channelRes.data);
        setVideos(videosRes.data.filter((v: any) => v.uploader === id));
      } catch (error: any) {
        console.error("Channel fetch failed:", error?.response?.status, id);
        setChannel(null);
      } finally {
        setLoading(false);
      }
    };

    fetchChannel();
  }, [router.query.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Still waiting for router to populate query
  if (!router.query.id || loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (!channel) {
    return (
      <div className="p-8 text-center text-gray-500">Channel not found</div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-white">
      <div className="max-w-full mx-auto">
        <ChannelHeader channel={channel} user={user} />
        <Channeltabs />
        <div className="px-4 pb-8">
          <ChannelVideos videos={videos} />
        </div>
      </div>
    </div>
  );
};

export default ChannelPage;
