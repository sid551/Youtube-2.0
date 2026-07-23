"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@/lib/AuthContext";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Loader2,
  SkipForward,
} from "lucide-react";

function Rewind10Icon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <text
        x="12"
        y="14.5"
        fontSize="7.5"
        fontFamily="sans-serif"
        fontWeight="800"
        fill="currentColor"
        stroke="none"
        textAnchor="middle"
      >
        10
      </text>
    </svg>
  );
}

function Forward10Icon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <text
        x="12"
        y="14.5"
        fontSize="7.5"
        fontFamily="sans-serif"
        fontWeight="800"
        fill="currentColor"
        stroke="none"
        textAnchor="middle"
      >
        10
      </text>
    </svg>
  );
}

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
    thumbnail?: string;
    videochanel?: string;
  };
  nextVideo?: {
    _id: string;
    videotitle: string;
    filepath?: string;
    thumbnail?: string;
    videochanel?: string;
  } | null;
  onNextVideo?: () => void;
}

export default function VideoPlayer({ video, nextVideo, onNextVideo }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const singleTapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [gestureFeedback, setGestureFeedback] = useState<{
    type: "rewind" | "forward" | null;
    id: number;
  }>({ type: null, id: 0 });

  // Auto hide gesture feedback animation
  useEffect(() => {
    if (gestureFeedback.type) {
      const timer = setTimeout(() => {
        setGestureFeedback({ type: null, id: 0 });
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [gestureFeedback.id, gestureFeedback.type]);

  // Format time (seconds -> MM:SS or HH:MM:SS)
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

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [isPlaying]);

  // Rewind 10 seconds
  const handleRewind10 = useCallback(() => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, videoRef.current.currentTime - 10);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  // Forward 10 seconds
  const handleForward10 = useCallback(() => {
    if (!videoRef.current) return;
    const newTime = Math.min(duration, videoRef.current.currentTime + 10);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  // Volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
    }
    setIsMuted(newVolume === 0);
  };

  // Mute / Unmute toggle
  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      const restoredVol = prevVolume > 0 ? prevVolume : 1;
      videoRef.current.muted = false;
      videoRef.current.volume = restoredVol;
      setVolume(restoredVol);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      videoRef.current.muted = true;
      setVolume(0);
      setIsMuted(true);
    }
  };

  // Seek handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  // Fullscreen toggle
  const toggleFullScreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error("Error attempting to exit fullscreen:", err);
      });
    }
  };

  // Sync fullscreen state
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullScreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
    };
  }, []);

  // Update buffer progress
  const handleProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(
        videoRef.current.buffered.length - 1
      );
      setBuffered(bufferedEnd);
    }
  };

  // Auto-hide controls logic
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      if (e.key === " " || e.key === "k" || e.key === "K") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullScreen();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(
            duration,
            videoRef.current.currentTime + 5
          );
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setVolume((prev) => {
          const next = Math.min(1, prev + 0.1);
          if (videoRef.current) {
            videoRef.current.volume = next;
            videoRef.current.muted = false;
          }
          setIsMuted(false);
          return next;
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setVolume((prev) => {
          const next = Math.max(0, prev - 0.1);
          if (videoRef.current) {
            videoRef.current.volume = next;
            videoRef.current.muted = next === 0;
          }
          setIsMuted(next === 0);
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [togglePlay, duration]);

  // Hover position calculation on progress bar
  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * duration);
  };

  const handleTimelineMouseLeave = () => {
    setHoverTime(null);
  };

  // Reset player states when video ID changes
  useEffect(() => {
    setHasEnded(false);
    setIsPlaying(false);
    setCurrentTime(0);
  }, [video?._id]);

  // Handle single tap (play/pause) and double tap (rewind/forward 10s on left/right halves)
  const handleVideoClick = (e: React.MouseEvent<HTMLDivElement | HTMLVideoElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeftHalf = clickX < rect.width / 2;
    const now = Date.now();
    const timeDiff = now - lastTapRef.current.time;

    if (timeDiff < 300 && Math.abs(clickX - lastTapRef.current.x) < 150) {
      // Double tap detected: cancel single-tap timer and trigger 10s seek
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = { time: 0, x: 0 };

      if (isLeftHalf) {
        handleRewind10();
        setGestureFeedback({ type: "rewind", id: now });
      } else {
        handleForward10();
        setGestureFeedback({ type: "forward", id: now });
      }
    } else {
      // Single tap candidate: wait 300ms before toggling play/pause
      lastTapRef.current = { time: now, x: clickX };
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      singleTapTimerRef.current = setTimeout(() => {
        togglePlay();
        singleTapTimerRef.current = null;
      }, 300);
    }
  };

  const videoSrc = `${
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
  }/${video?.filepath}`;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative group bg-black rounded-xl overflow-hidden aspect-video select-none shadow-2xl flex items-center justify-center cursor-pointer"
      tabIndex={0}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full h-full object-contain"
        onClick={handleVideoClick}
        onDoubleClick={toggleFullScreen}
        onLoadStart={() => setIsBuffering(true)}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            if (isBuffering && videoRef.current.readyState >= 3) {
              setIsBuffering(false);
            }
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
          }
        }}
        onDurationChange={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
          }
        }}
        onProgress={handleProgress}
        onWaiting={() => setIsBuffering(true)}
        onStalled={() => setIsBuffering(true)}
        onSeeking={() => setIsBuffering(true)}
        onSeeked={() => {
          if (videoRef.current && videoRef.current.readyState >= 3) {
            setIsBuffering(false);
          }
        }}
        onCanPlay={() => setIsBuffering(false)}
        onCanPlayThrough={() => setIsBuffering(false)}
        onPlaying={() => setIsBuffering(false)}
        onPlay={() => {
          setIsPlaying(true);
          setHasEnded(false);
          if (videoRef.current && videoRef.current.readyState >= 3) {
            setIsBuffering(false);
          }
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setIsBuffering(false);
          setHasEnded(true);
        }}
      />

      {/* End-Screen Next Video Overlay (YouTube Style - Theme Responsive) */}
      {hasEnded && nextVideo && (
        <div className="absolute inset-0 z-30 bg-black/60 dark:bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-white/95 dark:bg-zinc-900/95 text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 max-w-sm w-full shadow-2xl space-y-3 flex flex-col items-center group/nextcard">
            {/* Header Badge & Channel */}
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/70 px-2.5 py-0.5 rounded-full border border-red-200 dark:border-red-800/40">
                Up Next
              </span>
              {nextVideo.videochanel && (
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium truncate max-w-[150px]">
                  {nextVideo.videochanel}
                </span>
              )}
            </div>

            {/* Thumbnail Preview Box */}
            <div
              onClick={() => onNextVideo && onNextVideo()}
              className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-black/60 border border-gray-200 dark:border-gray-800 cursor-pointer group-hover/nextcard:scale-[1.02] transition-transform duration-300 shadow-md flex items-center justify-center"
            >
              {nextVideo.thumbnail ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/${nextVideo.thumbnail}`}
                  alt={nextVideo.videotitle}
                  className="w-full h-full object-cover"
                />
              ) : nextVideo.filepath ? (
                <video
                  src={`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/${nextVideo.filepath}`}
                  className="w-full h-full object-cover pointer-events-none"
                  preload="metadata"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                  <Play className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                </div>
              )}

              {/* Play Overlay Button on Thumbnail */}
              <div className="absolute inset-0 bg-black/20 group-hover/nextcard:bg-black/10 transition-colors flex items-center justify-center">
                <div className="p-3 rounded-full bg-red-600 text-white shadow-lg group-hover/nextcard:scale-110 transition-transform">
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                </div>
              </div>
            </div>

            {/* Video Title */}
            <h3
              onClick={() => onNextVideo && onNextVideo()}
              className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 cursor-pointer hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              {nextVideo.videotitle}
            </h3>

            {/* Action Buttons Row */}
            <div className="flex items-center space-x-3 pt-1 w-full">
              {/* Replay Button */}
              <button
                onClick={() => {
                  setHasEnded(false);
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    videoRef.current.play();
                  }
                }}
                className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 font-semibold text-xs sm:text-sm border border-gray-200 dark:border-zinc-700 transition-all focus:outline-none"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Replay</span>
              </button>

              {/* Play Next Button */}
              <button
                onClick={() => {
                  if (onNextVideo) {
                    onNextVideo();
                  }
                }}
                className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm shadow-lg transition-all focus:outline-none"
              >
                <SkipForward className="w-4 h-4 fill-current" />
                <span>Play Next</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buffering Loading Spinner Overlay */}
      {isBuffering && (
        <div className="absolute z-25 flex items-center justify-center p-4 rounded-full bg-black/60 backdrop-blur-md pointer-events-none">
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-red-600 animate-spin" />
        </div>
      )}

      {/* Gesture Feedback Ripple Animations */}
      {gestureFeedback.type === "rewind" && (
        <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center rounded-l-xl z-30 pointer-events-none animate-pulse">
          <div className="p-4 rounded-full bg-black/60 text-white flex flex-col items-center shadow-lg">
            <Rewind10Icon className="w-10 h-10" />
            <span className="text-xs font-bold mt-1 text-white">−10 seconds</span>
          </div>
        </div>
      )}

      {gestureFeedback.type === "forward" && (
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center rounded-r-xl z-30 pointer-events-none animate-pulse">
          <div className="p-4 rounded-full bg-black/60 text-white flex flex-col items-center shadow-lg">
            <Forward10Icon className="w-10 h-10" />
            <span className="text-xs font-bold mt-1 text-white">+10 seconds</span>
          </div>
        </div>
      )}

      {/* Center Controls Overlay (-10s, Play/Pause, +10s) */}
      {(!isPlaying || showControls) && (
        <div className="absolute z-10 flex items-center space-x-6 sm:space-x-8">
          {/* Rewind -10s */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRewind10();
            }}
            className={`p-3.5 rounded-full bg-black/60 text-white backdrop-blur-md transition-all duration-300 transform hover:scale-110 hover:bg-black/80 flex items-center justify-center ${
              !isPlaying ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 scale-90"
            }`}
            title="Rewind 10 seconds"
            aria-label="Rewind 10 seconds"
          >
            <Rewind10Icon className="w-8 h-8 sm:w-9 sm:h-9" />
          </button>

          {/* Center Play/Pause Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className={`p-4 sm:p-5 rounded-full bg-black/60 text-white backdrop-blur-md transition-all duration-300 transform hover:scale-110 hover:bg-black/80 ${
              !isPlaying ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 scale-90"
            }`}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-10 h-10 sm:w-12 sm:h-12 fill-current" />
            ) : currentTime >= duration && duration > 0 ? (
              <RotateCcw className="w-10 h-10 sm:w-12 sm:h-12" />
            ) : (
              <Play className="w-10 h-10 sm:w-12 sm:h-12 fill-current ml-1" />
            )}
          </button>

          {/* Forward +10s */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleForward10();
            }}
            className={`p-3.5 rounded-full bg-black/60 text-white backdrop-blur-md transition-all duration-300 transform hover:scale-110 hover:bg-black/80 flex items-center justify-center ${
              !isPlaying ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 scale-90"
            }`}
            title="Forward 10 seconds"
            aria-label="Forward 10 seconds"
          >
            <Forward10Icon className="w-8 h-8 sm:w-9 sm:h-9" />
          </button>
        </div>
      )}

      {/* Bottom Controls Bar Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-10 pb-3 px-4 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Seek / Progress Bar Container */}
        <div
          className="relative w-full h-3 flex items-center cursor-pointer mb-2 group/timeline"
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
        >
          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute bottom-5 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded shadow pointer-events-none border border-gray-700/50"
              style={{ left: `${hoverPosition}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}

          {/* Background Bar */}
          <div
            className="absolute left-0 right-0 h-1 rounded-full group-hover/timeline:h-1.5 transition-all overflow-hidden"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
          >
            {/* Buffer Bar */}
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${duration > 0 ? (buffered / duration) * 100 : 0}%`,
                backgroundColor: "rgba(255, 255, 255, 0.4)",
              }}
            />
          </div>

          {/* Played Bar */}
          <div
            className="absolute left-0 h-1 bg-red-600 rounded-full group-hover/timeline:h-1.5 transition-all"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          >
            {/* Scrubber Knob */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-red-600 rounded-full shadow opacity-0 group-hover/timeline:opacity-100 transition-opacity" />
          </div>

          {/* Range Input Overlay for seeking */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onInput={handleSeek}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* -10s Rewind Button */}
            <button
              onClick={handleRewind10}
              className="hover:text-red-500 transition-colors p-1 rounded-full focus:outline-none flex items-center justify-center"
              title="Rewind 10s (←)"
              aria-label="Rewind 10 seconds"
            >
              <Rewind10Icon className="w-5 h-5" />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="hover:text-red-500 transition-colors p-1 rounded-full focus:outline-none"
              title={isPlaying ? "Pause (k)" : "Play (k)"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current" />
              )}
            </button>

            {/* +10s Forward Button */}
            <button
              onClick={handleForward10}
              className="hover:text-red-500 transition-colors p-1 rounded-full focus:outline-none flex items-center justify-center"
              title="Forward 10s (→)"
              aria-label="Forward 10 seconds"
            >
              <Forward10Icon className="w-5 h-5" />
            </button>

            {/* Next Video Button */}
            {onNextVideo && (
              <button
                onClick={onNextVideo}
                className="hover:text-red-500 transition-colors p-1 rounded-full focus:outline-none"
                title="Next Video"
                aria-label="Next Video"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
            )}

            {/* Time Display */}
            <div className="text-xs sm:text-sm font-medium tracking-wide text-gray-200">
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1 text-gray-400">/</span>
              <span className="text-gray-400">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Volume Controls */}
            <div className="flex items-center space-x-2 group/volume">
              <button
                onClick={toggleMute}
                className="hover:text-gray-300 transition-colors p-1 focus:outline-none"
                title={isMuted ? "Unmute (m)" : "Mute (m)"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-red-500" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              {/* Volume Slider */}
              <div className="relative w-16 sm:w-20 h-3 flex items-center cursor-pointer group/volslider">
                {/* Track Background */}
                <div
                  className="absolute left-0 right-0 h-1 rounded-full group-hover/volslider:h-1.5 transition-all overflow-hidden"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.3)" }}
                >
                  {/* Filled Volume Bar */}
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(isMuted ? 0 : volume) * 100}%`,
                      backgroundColor: "#ffffff",
                    }}
                  />
                </div>
                {/* Thumb Knob */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full shadow opacity-0 group-hover/volslider:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    left: `${(isMuted ? 0 : volume) * 100}%`,
                    backgroundColor: "#ffffff",
                  }}
                />

                {/* Range Input Overlay */}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullScreen}
              className="hover:text-gray-300 transition-colors p-1 focus:outline-none"
              title={isFullScreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
            >
              {isFullScreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
