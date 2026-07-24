import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/router";
import { getSocket } from "@/lib/socket";

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [subLoading, setSubLoading] = useState(false);
  const [resolvedChannelId, setResolvedChannelId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCreatingParty, setIsCreatingParty] = useState(false);
  const router = useRouter();

  const handleCreateWatchParty = () => {
    setIsCreatingParty(true);
    try {
      const socket = getSocket();
      socket.emit("create_party", {
        video,
        user: user ? { _id: user._id, name: user.name, avatar: user.avatar } : { name: "Guest" },
      });

      const handleCreated = ({ roomId }: { roomId: string }) => {
        socket.off("party_created", handleCreated);
        setIsCreatingParty(false);
        toast.success("Watch Party room created!");
        router.push(`/watch-party/${roomId}`);
      };

      const handleError = ({ message }: { message: string }) => {
        socket.off("party_error", handleError);
        setIsCreatingParty(false);
        toast.error(message || "Could not create Watch Party");
      };

      socket.on("party_created", handleCreated);
      socket.on("party_error", handleError);
    } catch (err) {
      console.error("Watch Party creation error:", err);
      setIsCreatingParty(false);
      toast.error("Failed to connect to Watch Party server.");
    }
  };

  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  // Load subscribe status whenever uploader or logged-in user changes
  useEffect(() => {
    const channelIdentifier =
      video.uploader && video.uploader !== "undefined"
        ? video.uploader
        : video.videochanel;
    if (!channelIdentifier || channelIdentifier === "undefined") return;
    const fetchSub = async () => {
      try {
        const res = await axiosInstance.get(
          `/user/subscribe/status/${encodeURIComponent(channelIdentifier)}${
            user ? `?userId=${user._id}` : ""
          }`
        );
        setIsSubscribed(res.data.subscribed);
        setSubscriberCount(res.data.subscriberCount);
        if (res.data.channelId) {
          setResolvedChannelId(res.data.channelId);
        }
      } catch {
        // silently fail
      }
    };
    fetchSub();
  }, [video.uploader, video.videochanel, user?._id]);

  useEffect(() => {
    const handleviews = async () => {
      if (user) {
        try {
          return await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } catch (error) {
          return console.log(error);
        }
      } else {
        return await axiosInstance.post(`/history/views/${video?._id}`);
      }
    };
    handleviews();
  }, [user]);
  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.liked) {
        if (isLiked) {
          setlikes((prev: any) => prev - 1);
          setIsLiked(false);
        } else {
          setlikes((prev: any) => prev + 1);
          setIsLiked(true);
          if (isDisliked) {
            setDislikes((prev: any) => prev - 1);
            setIsDisliked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleWatchLater = async () => {
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(!isWatchLater);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleDislike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (!res.data.liked) {
        if (isDisliked) {
          setDislikes((prev: any) => prev - 1);
          setIsDisliked(false);
        } else {
          setDislikes((prev: any) => prev + 1);
          setIsDisliked(true);
          if (isLiked) {
            setlikes((prev: any) => prev - 1);
            setIsLiked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast.error("Sign in to subscribe");
      return;
    }
    const channelIdentifier =
      resolvedChannelId ||
      (video.uploader && video.uploader !== "undefined"
        ? video.uploader
        : video.videochanel);
    if (!channelIdentifier || channelIdentifier === "undefined") {
      toast.error("Channel information unavailable");
      return;
    }
    setSubLoading(true);
    try {
      const res = await axiosInstance.post(
        `/user/subscribe/${encodeURIComponent(channelIdentifier)}`,
        {
          userId: user._id,
        }
      );
      setIsSubscribed(res.data.subscribed);
      setSubscriberCount(res.data.subscriberCount);
      if (res.data.channelId) {
        setResolvedChannelId(res.data.channelId);
      }
      toast.success(res.data.subscribed ? "Subscribed!" : "Unsubscribed");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Something went wrong");
    } finally {
      setSubLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!user) {
      toast.error("Sign in to download videos");
      return;
    }
    setIsDownloading(true);
    try {
      const res = await axiosInstance.post(
        `/download/${video._id}`,
        { userId: user._id },
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${video.videotitle || "video"}.mp4`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (error: any) {
      const msg =
        error?.response?.data instanceof Blob
          ? JSON.parse(await error.response.data.text()).message
          : error?.response?.data?.message || "Download failed";
      toast.error(msg);
    } finally {
      setIsDownloading(false);
    }
  };

  const channelLink =
    resolvedChannelId ||
    (video.uploader && video.uploader !== "undefined"
      ? video.uploader
      : null);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {channelLink ? (
            <Link href={`/channel/${channelLink}`}>
              <Avatar className="w-10 h-10 cursor-pointer">
                <AvatarFallback>{video.videochanel?.[0] || "C"}</AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Avatar className="w-10 h-10">
              <AvatarFallback>{video.videochanel?.[0] || "C"}</AvatarFallback>
            </Avatar>
          )}
          <div>
            {channelLink ? (
              <Link href={`/channel/${channelLink}`}>
                <h3 className="font-medium hover:underline cursor-pointer">
                  {video.videochanel}
                </h3>
              </Link>
            ) : (
              <h3 className="font-medium">{video.videochanel}</h3>
            )}
            <p className="text-sm text-gray-600">
              {subscriberCount >= 1_000_000
                ? `${(subscriberCount / 1_000_000).toFixed(1)}M`
                : subscriberCount >= 1_000
                ? `${(subscriberCount / 1_000).toFixed(1)}K`
                : subscriberCount}{" "}
              subscribers
            </p>
          </div>
          {user?._id !== channelLink && (
            <Button
              onClick={handleSubscribe}
              disabled={subLoading}
              className={
                isSubscribed
                  ? "ml-2 bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300"
                  : "ml-2 bg-black hover:bg-gray-800 text-white"
              }
            >
              {isSubscribed ? "Subscribed" : "Subscribe"}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-gray-100 rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-1 ${
                  isLiked ? "fill-black text-black" : ""
                }`}
              />
              <span className="text-sm">{likes.toLocaleString()}</span>
            </Button>
            <div className="w-px h-6 bg-gray-300" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-5 h-5 mr-1 ${
                  isDisliked ? "fill-black text-black" : ""
                }`}
              />
              <span className="text-sm">{dislikes.toLocaleString()}</span>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-600 dark:hover:bg-purple-700 dark:text-white font-semibold rounded-full shadow-sm transition-all border border-purple-500/30 px-3.5"
            onClick={handleCreateWatchParty}
            disabled={isCreatingParty}
          >
            <Users className="w-4 h-4 mr-1.5 text-white" />
            <span className="text-white font-semibold text-sm">
              {isCreatingParty ? "Creating..." : "Watch Party"}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 rounded-full ${
              isWatchLater ? "text-primary" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">
              {isWatchLater ? "Saved" : "Watch Later"}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full"
          >
            <Share className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            <Download className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">
              {isDownloading ? "Downloading..." : "Download"}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-gray-100 rounded-full"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
    </div>
  );
};

export default VideoInfo;
