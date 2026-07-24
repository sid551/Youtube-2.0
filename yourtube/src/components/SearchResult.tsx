import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import axiosInstance from "@/lib/axiosinstance";
import { getVideoUrl } from "@/lib/utils";

const SearchResult = ({ query }: { query: string }) => {
  const [videoList, setVideoList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!query.trim()) {
      setLoading(false);
      return;
    }
    const fetchVideos = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get("/video/getall");
        const allVideos = res.data || [];
        const filtered = allVideos.filter(
          (vid: any) =>
            vid.videotitle?.toLowerCase().includes(query.toLowerCase()) ||
            vid.videochanel?.toLowerCase().includes(query.toLowerCase())
        );
        setVideoList(filtered);
      } catch (error) {
        console.error("Error fetching search results:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, [query]);

  if (!query.trim()) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          Enter a search term to find videos and channels.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">
        Searching videos...
      </div>
    );
  }

  if (videoList.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-gray-600">
          Try different keywords or check your search term
        </p>
      </div>
    );
  }

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {videoList.map((video: any) => {
          const hasUploader =
            video.uploader && video.uploader !== "undefined";
          return (
            <div key={video._id} className="flex flex-col sm:flex-row gap-4 group">
              <Link href={`/watch/${video._id}`} className="flex-shrink-0">
                <div className="relative w-full sm:w-80 aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <video
                    src={getVideoUrl(video.filepath)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
              </Link>

              <div className="flex-1 min-w-0 py-1">
                <Link href={`/watch/${video._id}`}>
                  <h3 className="font-medium text-base sm:text-lg line-clamp-2 group-hover:text-blue-600 mb-2">
                    {video.videotitle}
                  </h3>
                </Link>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-2">
                  <span>{video.views?.toLocaleString() || 0} views</span>
                  <span>•</span>
                  <span>
                    {video.createdAt
                      ? `${formatDistanceToNow(new Date(video.createdAt))} ago`
                      : "recently"}
                  </span>
                </div>

                {hasUploader ? (
                  <Link
                    href={`/channel/${video.uploader}`}
                    className="flex items-center gap-2 mb-2 hover:text-blue-600 w-fit"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {video.videochanel?.[0] || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-700 hover:underline">
                      {video.videochanel}
                    </span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {video.videochanel?.[0] || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-700">
                      {video.videochanel}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center py-4">
        <p className="text-sm text-gray-600">
          Showing {videoList.length} {videoList.length === 1 ? "result" : "results"} for "{query}"
        </p>
      </div>
    </div>
  );
};

export default SearchResult;
