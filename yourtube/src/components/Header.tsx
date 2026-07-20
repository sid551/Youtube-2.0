import {
  Bell,
  Menu,
  Mic,
  MicOff,
  Search,
  User,
  VideoIcon,
  X,
  Upload,
} from "lucide-react";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Channeldialogue from "./channeldialogue";
import VideoUploader from "./VideoUploader";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const PLAN_BADGE: Record<string, { label: string; className: string }> = {
  premium: { label: "Premium", className: "bg-blue-100 text-blue-700" },
  pro: { label: "Pro", className: "bg-purple-100 text-purple-700" },
};

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { user, logout, handlegooglesignin } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // Voice search
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const router = useRouter();

  // ── Notifications ──────────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.get(`/notification/${user._id}`);
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n: any) => !n.read).length);
    } catch {
      // silently fail
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
    // Poll every 60s
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close notification panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleBellClick = async () => {
    setShowNotifications((prev) => !prev);
    if (!showNotifications && unreadCount > 0) {
      try {
        await axiosInstance.patch(`/notification/read/${user._id}`);
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch {
        // silently fail
      }
    }
  };

  // ── Voice search ───────────────────────────────────────────────
  const handleVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Voice search isn't supported in this browser");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsListening(false);
      // Auto-submit after voice input
      router.push(`/search?q=${encodeURIComponent(transcript.trim())}`);
    };

    recognition.onerror = (e: any) => {
      setIsListening(false);
      if (e.error !== "aborted") toast.error("Voice search failed. Try again.");
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  // ── Search ─────────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowMobileSearch(false);
    }
  };

  // ── Video upload button ────────────────────────────────────────
  const handleVideoButtonClick = () => {
    if (!user) {
      toast.error("Sign in to upload videos");
      return;
    }
    if (!user.channelname) {
      setIsChannelDialogOpen(true);
      toast("Create a channel first to upload videos");
      return;
    }
    setShowUploadModal(true);
  };

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between px-2 sm:px-4 py-2 bg-white border-b h-14">
        {/* Mobile search overlay */}
        {showMobileSearch && (
          <div className="absolute inset-0 z-10 flex items-center gap-2 px-3 bg-white">
            <form
              onSubmit={handleSearch}
              className="flex flex-1 items-center gap-2"
            >
              <div className="flex flex-1">
                <Input
                  autoFocus
                  type="search"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-l-full border-r-0 focus-visible:ring-0"
                />
                <Button
                  type="submit"
                  className="rounded-r-full px-4 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-l-0"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </form>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleVoiceSearch}
              className={isListening ? "text-red-500" : ""}
            >
              {isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMobileSearch(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-1 sm:gap-4 shrink-0">
          <Button variant="ghost" size="icon" onClick={onMenuClick}>
            <Menu className="w-6 h-6" />
          </Button>
          <Link href="/" className="flex items-center gap-1">
            <div className="bg-red-600 p-1 rounded">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </div>
            <span className="text-lg font-medium hidden xs:inline sm:inline">
              YourTube
            </span>
            <span className="text-xs text-gray-400 ml-0.5 hidden sm:inline">
              IN
            </span>
          </Link>
        </div>

        {/* Center: search bar */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex items-center gap-2 flex-1 max-w-2xl mx-4"
        >
          <div className="flex flex-1">
            <Input
              type="search"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-l-full border-r-0 focus-visible:ring-0"
            />
            <Button
              type="submit"
              className="rounded-r-full px-6 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-l-0"
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>
          {/* Voice search button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`rounded-full transition-colors ${
              isListening ? "bg-red-100 text-red-600 animate-pulse" : ""
            }`}
            onClick={handleVoiceSearch}
            title={isListening ? "Stop listening" : "Search by voice"}
          >
            {isListening ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </Button>
        </form>

        {/* Right: actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Mobile search icon */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setShowMobileSearch(true)}
          >
            <Search className="w-5 h-5" />
          </Button>

          {user ? (
            <>
              {/* Upload video button */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex"
                title="Upload video"
                onClick={handleVideoButtonClick}
              >
                <VideoIcon className="w-5 h-5" />
              </Button>

              {/* Notifications bell */}
              <div className="relative hidden sm:block" ref={notifRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBellClick}
                  title="Notifications"
                  className="relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>

                {/* Notification panel */}
                {showNotifications && (
                  <div className="absolute right-0 top-10 w-80 bg-white border rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <span className="font-semibold text-sm">
                        Notifications
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setShowNotifications(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n._id}
                            className={`flex gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                              !n.read ? "bg-blue-50" : ""
                            }`}
                            onClick={() => {
                              setShowNotifications(false);
                              if (n.videoid?._id)
                                router.push(`/watch/${n.videoid._id}`);
                            }}
                          >
                            <div className="shrink-0 bg-red-100 rounded-full p-2 h-8 w-8 flex items-center justify-center">
                              <Upload className="w-4 h-4 text-red-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-800 line-clamp-2">
                                {n.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {formatDistanceToNow(new Date(n.createdAt))} ago
                              </p>
                            </div>
                            {!n.read && (
                              <span className="shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar + plan badge */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 rounded-full flex items-center gap-1.5 px-1"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image} />
                      <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    {PLAN_BADGE[user.plan] && (
                      <span
                        className={`hidden sm:inline text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                          PLAN_BADGE[user.plan].className
                        }`}
                      >
                        {PLAN_BADGE[user.plan].label}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  {user?.channelname ? (
                    <DropdownMenuItem asChild>
                      <Link href={`/channel/${user?._id}`}>Your channel</Link>
                    </DropdownMenuItem>
                  ) : (
                    <div className="px-2 py-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => setIsChannelDialogOpen(true)}
                      >
                        Create Channel
                      </Button>
                    </div>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/plans">
                      {user.plan === "free"
                        ? "Upgrade plan"
                        : `Manage plan (${user.plan})`}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/history">History</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/liked">Liked videos</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/watch-later">Watch later</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/downloads">Downloads</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              className="flex items-center gap-2 text-sm px-3"
              onClick={handlegooglesignin}
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Sign in</span>
            </Button>
          )}
        </div>

        <Channeldialogue
          isopen={isChannelDialogOpen}
          onclose={() => setIsChannelDialogOpen(false)}
          mode="create"
        />
      </header>

      {/* Upload modal */}
      {showUploadModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setShowUploadModal(false)}
          />
          <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-base">Upload video</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowUploadModal(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-5">
              <VideoUploader
                channelId={user?._id}
                channelName={user?.channelname}
                onSuccess={() => setShowUploadModal(false)}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Header;
