import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { getVideoUrl } from "@/lib/utils";

interface RelatedVideosProps {
  videos: Array<{
    _id: string;
    videotitle: string;
    videochanel: string;
    views: number;
    createdAt: string;
    filepath?: string;
    uploader?: string;
  }>;
}

export default function RelatedVideos({ videos }: RelatedVideosProps) {
  return (
    <div className="space-y-3">
      {videos.map((video) => {
        const hasUploader = video.uploader && video.uploader !== "undefined";
        const videoSrc = getVideoUrl(video.filepath) || "/video/vdo.mp4";

        return (
          <div key={video._id} className="flex gap-2 group">
            {/* Thumbnail */}
            <Link
              href={`/watch/${video._id}`}
              className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden flex-shrink-0"
            >
              <video
                src={videoSrc}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <Link href={`/watch/${video._id}`}>
                <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600">
                  {video.videotitle}
                </h3>
              </Link>

              {hasUploader ? (
                <Link href={`/channel/${video.uploader}`}>
                  <p className="text-xs text-gray-600 mt-1 hover:underline hover:text-black">
                    {video.videochanel}
                  </p>
                </Link>
              ) : (
                <p className="text-xs text-gray-600 mt-1">{video.videochanel}</p>
              )}

              <p className="text-xs text-gray-500">
                {video.views?.toLocaleString() || 0} views •{" "}
                {video.createdAt
                  ? `${formatDistanceToNow(new Date(video.createdAt))} ago`
                  : "recently"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
