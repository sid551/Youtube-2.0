"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, X, Clock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getVideoUrl } from "@/lib/utils";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

export default function WatchLaterContent() {
  const [watchLater, setWatchLater] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadWatchLater();
    }
  }, [user]);

  const loadWatchLater = async () => {
    if (!user) return;

    try {
      const watchLaterData = await axiosInstance.get(`/watch/${user?._id}`);
      const validWatchLater = Array.isArray(watchLaterData.data)
        ? watchLaterData.data.filter((item: any) => item && item.videoid && item.videoid._id)
        : [];
      setWatchLater(validWatchLater);
    } catch (error) {
      console.error("Error loading watch later:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading watch later...</div>;
  }
  const handleRemoveFromWatchLater = async (watchLaterId: string) => {
    try {
      console.log("Removing from watch later:", watchLaterId);
      setWatchLater(watchLater.filter((item) => item._id !== watchLaterId));
    } catch (error) {
      console.error("Error removing from watch later:", error);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Save videos for later</h2>
        <p className="text-gray-600">
          Sign in to access your Watch later playlist.
        </p>
      </div>
    );
  }

  if (watchLater.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No videos saved</h2>
        <p className="text-gray-600">
          Videos you save for later will appear here.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{watchLater.length} videos</p>
        <Button className="flex items-center gap-2">
          <Play className="w-4 h-4" />
          Play all
        </Button>
      </div>

      <div className="space-y-4">
        {watchLater.map((item) => {
          if (!item?.videoid) return null;
          const v = item.videoid;
          return (
            <div key={item._id} className="flex flex-col xs:flex-row gap-3 sm:gap-4 group bg-white dark:bg-zinc-900 xs:bg-transparent p-2.5 xs:p-0 rounded-xl">
              <Link href={`/watch/${v._id}`} className="flex-shrink-0 w-full xs:w-40 sm:w-48">
                <div className="relative w-full aspect-video bg-gray-100 dark:bg-zinc-800 rounded-xl overflow-hidden shadow-sm">
                  <video
                    src={getVideoUrl(v.filepath)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    preload="metadata"
                  />
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <Link href={`/watch/${v._id}`}>
                  <h3 className="font-medium text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-1 text-gray-900 dark:text-gray-100">
                    {v.videotitle || "Untitled Video"}
                  </h3>
                </Link>
                {v.uploader && v.uploader !== "undefined" ? (
                  <Link href={`/channel/${v.uploader}`}>
                    <p className="text-xs text-gray-600 dark:text-gray-400 hover:underline hover:text-gray-900 dark:hover:text-gray-200 truncate">
                      {v.videochanel || "Unknown Channel"}
                    </p>
                  </Link>
                ) : (
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {v.videochanel || "Unknown Channel"}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {(v.views || 0).toLocaleString()} views •{" "}
                  {v.createdAt ? formatDistanceToNow(new Date(v.createdAt)) : "recently"} ago
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  Saved {item.createdAt ? formatDistanceToNow(new Date(item.createdAt)) : "recently"} ago
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="self-start sm:self-center opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleRemoveFromWatchLater(item._id)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove from Watch later
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}

      </div>
    </div>
  );
}
