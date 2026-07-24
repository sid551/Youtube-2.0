"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Socket } from "socket.io-client";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Loader2,
  Users,
  Crown,
  Lock,
} from "lucide-react";

import { getVideoUrl, DEFAULT_FALLBACK_VIDEO } from "@/lib/utils";

interface WatchPartyPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
    thumbnail?: string;
    videochanel?: string;
  };
  roomId: string;
  socket: Socket;
  isHost?: boolean;
  initialCurrentTime?: number;
  initialIsPlaying?: boolean;
}

export default function WatchPartyPlayer({
  video,
  roomId,
  socket,
  isHost = true,
  initialCurrentTime = 0,
  initialIsPlaying = false,
}: WatchPartyPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRemoteEventRef = useRef<boolean>(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [syncStatus, setSyncStatus] = useState<string>("In Sync");

  const [failedSrc, setFailedSrc] = useState(false);

  const videoSrc = failedSrc
    ? DEFAULT_FALLBACK_VIDEO
    : getVideoUrl(video?.filepath);

  // Handle incoming remote video state changes from socket
  useEffect(() => {
    if (!socket) return;

    const handleVideoStateChanged = (data: {
      action: string;
      currentTime: number;
      isPlaying: boolean;
      senderId: string;
      senderName: string;
      isHost?: boolean;
    }) => {
      if (!videoRef.current) return;

      // Ignore our own emitted events
      if (data.senderId === socket.id) return;

      isRemoteEventRef.current = true;
      setSyncStatus(`Synced with Host (${data.senderName})`);

      const currentVidTime = videoRef.current.currentTime;
      const targetTime = data.currentTime;

      // Adjust playback position if drift is larger than 0.5s
      if (Math.abs(currentVidTime - targetTime) > 0.5) {
        videoRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
      }

      if (data.isPlaying) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }

      setTimeout(() => {
        isRemoteEventRef.current = false;
        setSyncStatus("In Sync");
      }, 300);
    };

    const handleSyncState = (data: { currentTime: number; isPlaying: boolean }) => {
      if (!videoRef.current) return;

      isRemoteEventRef.current = true;
      videoRef.current.currentTime = data.currentTime;
      setCurrentTime(data.currentTime);

      if (data.isPlaying) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }

      setTimeout(() => {
        isRemoteEventRef.current = false;
        setSyncStatus("In Sync");
      }, 300);
    };

    socket.on("video_state_changed", handleVideoStateChanged);
    socket.on("sync_state", handleSyncState);

    return () => {
      socket.off("video_state_changed", handleVideoStateChanged);
      socket.off("sync_state", handleSyncState);
    };
  }, [socket]);

  // Apply initial synced time on initial load
  useEffect(() => {
    if (videoRef.current && initialCurrentTime > 0) {
      isRemoteEventRef.current = true;
      videoRef.current.currentTime = initialCurrentTime;
      setCurrentTime(initialCurrentTime);
      if (initialIsPlaying) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      setTimeout(() => {
        isRemoteEventRef.current = false;
      }, 300);
    }
  }, [initialCurrentTime, initialIsPlaying]);

  // Format time MM:SS or HH:MM:SS
  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return "00:00";
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const pad = (num: number) => num.toString().padStart(2, "0");

    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // Emit play / pause / seek events to socket (Host only)
  const handlePlayEvent = () => {
    setIsPlaying(true);
    if (isHost && !isRemoteEventRef.current && videoRef.current) {
      socket.emit("video_action", {
        roomId,
        action: "play",
        currentTime: videoRef.current.currentTime,
        isPlaying: true,
      });
    }
  };

  const handlePauseEvent = () => {
    setIsPlaying(false);
    if (isHost && !isRemoteEventRef.current && videoRef.current) {
      socket.emit("video_action", {
        roomId,
        action: "pause",
        currentTime: videoRef.current.currentTime,
        isPlaying: false,
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHost) return;
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);

    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;

      if (!isRemoteEventRef.current) {
        socket.emit("video_action", {
          roomId,
          action: "seek",
          currentTime: targetTime,
          isPlaying: !videoRef.current.paused,
        });
      }
    }
  };

  const togglePlay = useCallback(() => {
    if (!isHost || !videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [isHost, isPlaying]);

  // Fullscreen toggle
  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullScreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
    };
  }, []);

  // Volume & Mute (Personal viewer controls)
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      const restored = prevVolume > 0 ? prevVolume : 1;
      videoRef.current.muted = false;
      videoRef.current.volume = restored;
      setVolume(restored);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      videoRef.current.muted = true;
      setVolume(0);
      setIsMuted(true);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative group bg-black rounded-2xl overflow-hidden aspect-video select-none shadow-2xl flex items-center justify-center border border-zinc-800"
    >
      {/* Live Sync Status Badge */}
      <div className="absolute top-4 left-4 z-30 flex items-center space-x-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-purple-500/40 text-xs font-semibold text-white">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
        </span>
        {isHost ? (
          <span className="flex items-center text-amber-300">
            <Crown className="w-3.5 h-3.5 mr-1 fill-current text-amber-400" /> You are Host
          </span>
        ) : (
          <span className="flex items-center text-purple-200">
            <Lock className="w-3 h-3 mr-1 text-purple-400" /> Host Controls Playback
          </span>
        )}
      </div>

      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full h-full object-contain cursor-default"
        onClick={isHost ? togglePlay : undefined}
        onDoubleClick={toggleFullScreen}
        onError={() => {
          setIsBuffering(false);
          if (!failedSrc) setFailedSrc(true);
        }}
        onPlay={handlePlayEvent}
        onPause={handlePauseEvent}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
          }
        }}
        onProgress={() => {
          if (videoRef.current && videoRef.current.buffered.length > 0) {
            setBuffered(
              videoRef.current.buffered.end(videoRef.current.buffered.length - 1)
            );
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
      />

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute z-25 flex items-center justify-center p-4 rounded-full bg-black/60 backdrop-blur-md pointer-events-none">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        </div>
      )}

      {/* Center Big Play/Pause Toggle for Host Only */}
      {isHost && (!isPlaying || showControls) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className={`absolute z-20 p-5 rounded-full bg-purple-600/80 text-white backdrop-blur-md transition-all duration-300 transform hover:scale-110 hover:bg-purple-600 ${
            !isPlaying ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 scale-90"
          }`}
        >
          {isPlaying ? (
            <Pause className="w-10 h-10 fill-current" />
          ) : (
            <Play className="w-10 h-10 fill-current ml-1" />
          )}
        </button>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-10 pb-3 px-4 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar */}
        <div className={`relative w-full h-3 flex items-center mb-2 group/timeline ${isHost ? "cursor-pointer" : "cursor-not-allowed"}`}>
          <div className="absolute left-0 right-0 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/40 rounded-full"
              style={{ width: `${duration > 0 ? (buffered / duration) * 100 : 0}%` }}
            />
          </div>
          <div
            className="absolute left-0 h-1 bg-purple-500 rounded-full"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          >
            {isHost && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-purple-400 rounded-full shadow opacity-0 group-hover/timeline:opacity-100 transition-opacity" />
            )}
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            disabled={!isHost}
            onChange={handleSeek}
            className={`absolute inset-0 w-full h-full opacity-0 z-10 ${isHost ? "cursor-pointer" : "cursor-not-allowed"}`}
          />
        </div>

        {/* Bottom Control Actions */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            {isHost ? (
              <button
                onClick={togglePlay}
                className="hover:text-purple-400 transition-colors p-1"
                title={isPlaying ? "Pause (Host)" : "Play (Host)"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
              </button>
            ) : (
              <div className="flex items-center text-xs text-amber-300/90 font-medium px-2 py-0.5 bg-amber-950/40 rounded border border-amber-800/40">
                <Lock className="w-3 h-3 mr-1" />
                <span>Synced</span>
              </div>
            )}

            <div className="text-xs font-medium text-gray-300">
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1 text-gray-500">/</span>
              <span className="text-gray-400">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Personal Volume Control */}
            <div className="flex items-center space-x-2">
              <button onClick={toggleMute} className="hover:text-purple-400 p-1" title="Volume">
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 accent-purple-500 bg-gray-600 rounded cursor-pointer"
              />
            </div>

            {/* Fullscreen button */}
            <button onClick={toggleFullScreen} className="hover:text-purple-400 p-1" title="Fullscreen">
              {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
