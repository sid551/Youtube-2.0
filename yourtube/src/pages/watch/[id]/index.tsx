import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const WatchPage = () => {
  const router = useRouter();

  const [video, setVideo] = useState<any>(null);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady) return;
    const id = router.query.id as string;
    if (!id) return;

    const fetchVideo = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get("/video/getall");
        const found = res.data.find((v: any) => v._id === id);
        setVideo(found || null);
        setAllVideos(res.data);
      } catch (error) {
        console.error("fetchVideo error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [router.isReady, router.query.id]);

  const currentIndex = allVideos.findIndex((v: any) => v._id === video?._id);
  const nextVideo =
    allVideos.length > 0
      ? allVideos[currentIndex !== -1 ? (currentIndex + 1) % allVideos.length : 0]
      : null;

  const handleNextVideo = () => {
    if (nextVideo && nextVideo._id) {
      router.push(`/watch/${nextVideo._id}`);
    }
  };

  if (loading)
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!video)
    return <div className="p-8 text-center text-gray-500">Video not found</div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-3 sm:p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Videopplayer
              video={video}
              nextVideo={nextVideo}
              onNextVideo={handleNextVideo}
            />
            <VideoInfo video={video} />
            <Comments videoId={router.query.id} />
          </div>
          <div className="space-y-4">
            <RelatedVideos videos={allVideos} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchPage;
