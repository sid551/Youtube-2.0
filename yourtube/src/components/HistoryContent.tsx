"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, X, Clock } from "lucide-react";
import { toast } from "sonner";
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

export default function HistoryContent() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadHistory();
    } else {
      setLoading(true);
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;

    try {
      const historyData = await axiosInstance.get(`/history/${user?._id}`);
      const validHistory = Array.isArray(historyData.data)
        ? historyData.data.filter((item: any) => item && item.videoid && item.videoid._id)
        : [];
      setHistory(validHistory);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return <div>Loading history...</div>;
  }

  const handleRemoveFromHistory = async (historyId: string) => {
    try {
      await axiosInstance.delete(`/history/${historyId}`);
      setHistory((prev) => prev.filter((item) => item._id !== historyId));
      toast.success("Removed from watch history");
    } catch (error) {
      console.error("Error removing from history:", error);
      toast.error("Failed to remove from watch history");
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          Keep track of what you watch
        </h2>
        <p className="text-gray-600">
          Watch history isn't viewable when signed out.
        </p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No watch history yet</h2>
        <p className="text-gray-600">Videos you watch will appear here.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{history.length} videos</p>
      </div>

      <div className="space-y-4">
        {history.map((item) => {
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
                  Watched {item.updatedAt || item.createdAt ? formatDistanceToNow(new Date(item.updatedAt || item.createdAt)) : "recently"} ago
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
                    onClick={() => handleRemoveFromHistory(item._id)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove from watch history
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
