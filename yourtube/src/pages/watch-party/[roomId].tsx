import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { getSocket } from "@/lib/socket";
import WatchPartyPlayer from "@/components/WatchPartyPlayer";
import WatchPartyVideoGrid from "@/components/WatchPartyVideoGrid";
import PartySidebar from "@/components/PartySidebar";
import Comments from "@/components/Comments";
import { Socket } from "socket.io-client";
import { ArrowLeft, Loader2, Users, AlertCircle, Tv } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface FloatingReaction {
  id: string;
  emoji: string;
  userName: string;
  leftPercent: number;
}

const WatchPartyPage = () => {
  const router = useRouter();
  const { user } = useUser();
  const [socket, setSocket] = useState<Socket | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [video, setVideo] = useState<any>(null);
  const [hostId, setHostId] = useState<string>("");
  const [hostName, setHostName] = useState<string>("");
  const [participants, setParticipants] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  useEffect(() => {
    if (!router.isReady) return;
    const roomId = router.query.roomId as string;
    if (!roomId) return;

    const s = getSocket();
    setSocket(s);

    // Join room
    s.emit("join_party", {
      roomId,
      user: user
        ? { _id: user._id, name: user.name, avatar: user.avatar }
        : { name: "Guest Viewer" },
    });

    const handlePartyJoined = (data: any) => {
      setLoading(false);
      setVideo(data.video);
      setHostId(data.hostId);
      setHostName(data.hostName);
      setParticipants(data.participants || []);
      setChatMessages(data.chatMessages || []);
      setCurrentTime(data.currentTime || 0);
      setIsPlaying(data.isPlaying || false);
    };

    const handleUserJoined = (data: any) => {
      setParticipants(data.participants);
      if (data.systemMessage) {
        setChatMessages((prev) => [...prev, data.systemMessage]);
      }
    };

    const handleUserLeft = (data: any) => {
      setParticipants(data.participants);
      if (data.hostId) setHostId(data.hostId);
      if (data.hostName) setHostName(data.hostName);
      if (data.systemMessage) {
        setChatMessages((prev) => [...prev, data.systemMessage]);
      }
    };

    const handleNewChatMessage = (msg: any) => {
      setChatMessages((prev) => [...prev, msg]);
    };

    const handleNewReaction = (data: any) => {
      const newReaction: FloatingReaction = {
        id: data.id,
        emoji: data.emoji,
        userName: data.userName,
        leftPercent: Math.floor(Math.random() * 70) + 15,
      };
      setFloatingReactions((prev) => [...prev, newReaction]);

      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }, 2200);
    };

    const handlePartyError = (errData: { message: string }) => {
      setLoading(false);
      setError(errData.message || "Failed to load watch party room.");
    };

    s.on("party_joined", handlePartyJoined);
    s.on("user_joined", handleUserJoined);
    s.on("user_left", handleUserLeft);
    s.on("new_chat_message", handleNewChatMessage);
    s.on("new_reaction", handleNewReaction);
    s.on("party_error", handlePartyError);

    return () => {
      s.emit("leave_party", { roomId });
      s.off("party_joined", handlePartyJoined);
      s.off("user_joined", handleUserJoined);
      s.off("user_left", handleUserLeft);
      s.off("new_chat_message", handleNewChatMessage);
      s.off("new_reaction", handleNewReaction);
      s.off("party_error", handlePartyError);
    };
  }, [router.isReady, router.query.roomId, user]);

  const handleSendReaction = (emoji: string) => {
    const roomId = router.query.roomId as string;
    if (socket && roomId) {
      socket.emit("send_reaction", { roomId, emoji });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
        <p className="text-sm font-semibold text-zinc-400">Joining Watch Party...</p>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-4 rounded-full bg-red-950/50 border border-red-800/40 text-red-400">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h1 className="text-xl font-bold">Watch Party Not Found</h1>
        <p className="text-sm text-zinc-400 max-w-md">
          {error || "This watch party session may have ended or the link is invalid."}
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 font-semibold text-sm transition-all"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  const roomId = router.query.roomId as string;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Navbar Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push(`/watch/${video._id}`)}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-300"
              title="Leave Watch Party & Return to Video"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-purple-600 text-white shadow-md">
                <Tv className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-wide">
                  Watch Party
                </h1>
                <p className="text-xs text-purple-400 font-medium">
                  Host: {hostName || "Host"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1.5 bg-purple-950/80 border border-purple-800/50 px-3 py-1 rounded-full text-xs font-semibold text-purple-300">
              <Users className="w-3.5 h-3.5" />
              <span>{participants.length} Watching</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Watch Party Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Synchronized Video Player & Video Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            {socket && (
              <WatchPartyPlayer
                video={video}
                roomId={roomId}
                socket={socket}
                isHost={
                  participants.find((p) => p.socketId === socket.id)?.isHost ||
                  (user?._id && hostId === user._id) ||
                  (participants.length > 0 && participants[0].socketId === socket.id)
                }
                initialCurrentTime={currentTime}
                initialIsPlaying={isPlaying}
              />
            )}

            {/* Floating Animated Reactions Overlay */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
              {floatingReactions.map((r) => (
                <div
                  key={r.id}
                  className="absolute bottom-12 flex flex-col items-center animate-float-up"
                  style={{ left: `${r.leftPercent}%` }}
                >
                  <span className="text-4xl filter drop-shadow-lg animate-bounce">
                    {r.emoji}
                  </span>
                  <span className="text-[10px] bg-black/70 text-purple-300 px-1.5 py-0.5 rounded font-semibold backdrop-blur-xs">
                    {r.userName}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* WebRTC Face-to-Face Video Call Grid */}
          {socket && (
            <WatchPartyVideoGrid
              roomId={roomId}
              socket={socket}
              currentUser={user}
              participants={participants}
              isHost={
                participants.find((p) => p.socketId === socket.id)?.isHost ||
                (user?._id && hostId === user._id) ||
                (participants.length > 0 && participants[0].socketId === socket.id)
              }
            />
          )}

          {/* Video Metadata Box */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <h2 className="text-lg font-bold text-white line-clamp-2">
              {video.videotitle}
            </h2>
            <div className="flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/80 pt-3">
              <span>Channel: <strong className="text-zinc-200">{video.videochanel || "Unknown"}</strong></span>
              <span>Views: {video.views ? video.views.toLocaleString() : 0}</span>
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-zinc-900 bg-white">
            <Comments videoId={video._id} />
          </div>
        </div>

        {/* Right Column: Watch Party Sidebar */}
        <div className="lg:col-span-1 h-[650px] sticky top-20">
          {socket && (
            <PartySidebar
              roomId={roomId}
              socket={socket}
              participants={participants}
              chatMessages={chatMessages}
              hostId={hostId}
              videoTitle={video.videotitle}
              onSendReaction={handleSendReaction}
            />
          )}
        </div>
      </main>

      <style jsx global>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.8);
          }
          50% {
            opacity: 1;
            transform: translateY(-80px) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translateY(-160px) scale(1);
          }
        }
        .animate-float-up {
          animation: floatUp 2.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default WatchPartyPage;
