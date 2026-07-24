import Link from "next/link";
import { useRouter } from "next/router";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { getVideoUrl } from "@/lib/utils";

export default function VideoCard({ video }: any) {
  const router = useRouter();

  if (!video?._id) return null;

  const hasUploader = video.uploader && video.uploader !== "undefined";

  return (
    <div className="group cursor-pointer space-y-2.5 sm:space-y-3">
      {/* Thumbnail — navigates to watch page */}
      <div
        className="relative aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shadow-sm"
        onClick={() => router.push(`/watch/${video._id}`)}
      >
        <video
          src={getVideoUrl(video.filepath)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
          preload="metadata"
        />
      </div>

      <div className="flex gap-2.5 sm:gap-3 px-0.5">
        {/* Avatar — navigates to channel */}
        {hasUploader ? (
          <Link href={`/channel/${video.uploader}`}>
            <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 cursor-pointer border border-gray-200 dark:border-zinc-800">
              <AvatarFallback className="text-xs font-semibold">{video.videochanel?.[0] || "C"}</AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 border border-gray-200 dark:border-zinc-800">
            <AvatarFallback className="text-xs font-semibold">{video.videochanel?.[0] || "C"}</AvatarFallback>
          </Avatar>
        )}

        <div className="flex-1 min-w-0">
          {/* Title — navigates to watch page */}
          <h3
            className="font-medium text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 text-gray-900 dark:text-gray-100"
            onClick={() => router.push(`/watch/${video._id}`)}
          >
            {video.videotitle}
          </h3>

          {/* Channel name — navigates to channel page */}
          {hasUploader ? (
            <Link href={`/channel/${video.uploader}`}>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 hover:underline hover:text-gray-900 dark:hover:text-gray-200 truncate">
                {video.videochanel}
              </p>
            </Link>
          ) : (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">{video.videochanel}</p>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400">
            {video.views?.toLocaleString()} views •{" "}
            {formatDistanceToNow(new Date(video.createdAt))} ago
          </p>
        </div>
      </div>
    </div>
  );
}

