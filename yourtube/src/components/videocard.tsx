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
    <div className="group cursor-pointer space-y-3">
      {/* Thumbnail — navigates to watch page */}
      <div
        className="relative aspect-video rounded-lg overflow-hidden bg-gray-100"
        onClick={() => router.push(`/watch/${video._id}`)}
      >
        <video
          src={getVideoUrl(video.filepath)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
      </div>

      <div className="flex gap-3">
        {/* Avatar — navigates to channel */}
        {hasUploader ? (
          <Link href={`/channel/${video.uploader}`}>
            <Avatar className="w-9 h-9 flex-shrink-0 cursor-pointer">
              <AvatarFallback>{video.videochanel?.[0]}</AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarFallback>{video.videochanel?.[0]}</AvatarFallback>
          </Avatar>
        )}

        <div className="flex-1 min-w-0">
          {/* Title — navigates to watch page */}
          <h3
            className="font-medium text-sm line-clamp-2 hover:text-blue-600"
            onClick={() => router.push(`/watch/${video._id}`)}
          >
            {video.videotitle}
          </h3>

          {/* Channel name — navigates to channel page */}
          {hasUploader ? (
            <Link href={`/channel/${video.uploader}`}>
              <p className="text-sm text-gray-600 mt-1 hover:underline">
                {video.videochanel}
              </p>
            </Link>
          ) : (
            <p className="text-sm text-gray-600 mt-1">{video.videochanel}</p>
          )}

          <p className="text-sm text-gray-600">
            {video.views?.toLocaleString()} views •{" "}
            {formatDistanceToNow(new Date(video.createdAt))} ago
          </p>
        </div>
      </div>
    </div>
  );
}
