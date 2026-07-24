"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
  Users,
  Crown,
  X,
  MonitorUp,
  MonitorOff,
  Tv,
  CircleDot,
  Square,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { toast } from "sonner";

interface WatchPartyVideoGridProps {
  roomId: string;
  socket: Socket;
  currentUser: any;
  participants: any[];
  isHost?: boolean;
}

interface RemotePeer {
  socketId: string;
  user: any;
  peerConnection?: RTCPeerConnection;
  stream?: MediaStream | null;
  isMuted?: boolean;
  isVideoOff?: boolean;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// Remote Video Tile Sub-component
const RemoteVideoTile: React.FC<{ peer: RemotePeer }> = ({ peer }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  const userName = peer.user?.userName || peer.user?.name || "Participant";
  const avatarUrl = peer.user?.userAvatar || peer.user?.avatar;

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-md group">
      {peer.stream && !peer.isVideoOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover rounded-xl"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-purple-950/30 to-zinc-900 p-4">
          <Avatar className="w-14 h-14 border-2 border-purple-500/50 shadow-lg animate-pulse">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-purple-900 text-purple-200 font-bold text-lg">
              {userName[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <span className="mt-2 text-xs font-semibold text-zinc-300">
            Camera Off
          </span>
        </div>
      )}

      {/* Overlay Status Bar */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-xs">
        <span className="font-semibold text-white truncate max-w-[120px]">
          {userName}
        </span>
        <div className="flex items-center space-x-1">
          {peer.isMuted ? (
            <span className="p-1 rounded bg-red-500/80 text-white" title="Muted">
              <MicOff className="w-3 h-3" />
            </span>
          ) : (
            <span className="p-1 rounded bg-emerald-500/80 text-white animate-pulse" title="Microphone On">
              <Mic className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default function WatchPartyVideoGrid({
  roomId,
  socket,
  currentUser,
  participants,
  isHost = false,
}: WatchPartyVideoGridProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

  const [showParticipantModal, setShowParticipantModal] = useState(false);

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [activeScreenSharer, setActiveScreenSharer] = useState<{
    socketId: string;
    userName: string;
  } | null>(null);

  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // Session Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingHost, setIsRecordingHost] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeer>>(
    new Map()
  );

  useEffect(() => {
    if (screenVideoRef.current) {
      if (isScreenSharing && screenStream) {
        screenVideoRef.current.srcObject = screenStream;
      } else if (activeScreenSharer && activeScreenSharer.socketId !== socket.id) {
        const remotePeer = remotePeers.get(activeScreenSharer.socketId);
        if (remotePeer?.stream) {
          screenVideoRef.current.srcObject = remotePeer.stream;
        }
      }
    }
  }, [isScreenSharing, screenStream, activeScreenSharer, remotePeers, socket.id]);

  // Keep local stream ref updated
  useEffect(() => {
    localStreamRef.current = localStream;
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Clean up WebRTC peer connection for a specific target socket
  const removePeerConnection = useCallback((targetSocketId: string) => {
    const pc = peerConnections.current.get(targetSocketId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(targetSocketId);
    }
    setRemotePeers((prev) => {
      const updated = new Map(prev);
      updated.delete(targetSocketId);
      return updated;
    });
  }, []);

  // Create an RTCPeerConnection for a target peer
  const createPeerConnection = useCallback(
    (targetSocketId: string, targetUser?: any): RTCPeerConnection => {
      if (peerConnections.current.has(targetSocketId)) {
        return peerConnections.current.get(targetSocketId)!;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local stream tracks to PC if available
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc_signal", {
            targetSocketId,
            signal: { type: "candidate", candidate: event.candidate },
          });
        }
      };

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setRemotePeers((prev) => {
          const updated = new Map(prev);
          const existing = updated.get(targetSocketId) || {
            socketId: targetSocketId,
            user: targetUser,
          };
          updated.set(targetSocketId, {
            ...existing,
            stream: remoteStream,
          });
          return updated;
        });
      };

      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === "disconnected" ||
          pc.iceConnectionState === "failed" ||
          pc.iceConnectionState === "closed"
        ) {
          removePeerConnection(targetSocketId);
        }
      };

      peerConnections.current.set(targetSocketId, pc);

      setRemotePeers((prev) => {
        const updated = new Map(prev);
        if (!updated.has(targetSocketId)) {
          updated.set(targetSocketId, {
            socketId: targetSocketId,
            user: targetUser,
            peerConnection: pc,
          });
        }
        return updated;
      });

      return pc;
    },
    [socket, removePeerConnection]
  );

  // Setup Socket WebRTC Signaling Listeners
  useEffect(() => {
    if (!socket) return;

    // Received list of existing call participants upon joining call
    const handleExistingParticipants = async (
      existingUsers: { socketId: string; user: any }[]
    ) => {
      for (const item of existingUsers) {
        const pc = createPeerConnection(item.socketId, item.user);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("webrtc_signal", {
            targetSocketId: item.socketId,
            signal: { type: "offer", sdp: offer },
          });
        } catch (err) {
          console.error("Error creating WebRTC offer:", err);
        }
      }
    };

    // A new user joined video call
    const handleUserJoinedCall = ({
      socketId,
      user,
    }: {
      socketId: string;
      user: any;
    }) => {
      createPeerConnection(socketId, user);
      toast.info(`${user?.userName || user?.name || "A participant"} joined the video call`);
    };

    // A user left video call
    const handleUserLeftCall = ({ socketId }: { socketId: string }) => {
      removePeerConnection(socketId);
    };

    // WebRTC signal exchange (offer, answer, candidate)
    const handleWebRTCSignal = async ({
      senderSocketId,
      signal,
    }: {
      senderSocketId: string;
      signal: any;
    }) => {
      let pc = peerConnections.current.get(senderSocketId);

      if (!pc && signal.type === "offer") {
        const senderParticipant = participants.find(
          (p) => p.socketId === senderSocketId
        );
        pc = createPeerConnection(senderSocketId, senderParticipant);
      }

      if (!pc) return;

      try {
        if (signal.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("webrtc_signal", {
            targetSocketId: senderSocketId,
            signal: { type: "answer", sdp: answer },
          });
        } else if (signal.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.type === "candidate" && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error("Error handling WebRTC signal:", err);
      }
    };

    // Media State change (Mic muted / Video turned off)
    const handleMediaStateChanged = ({
      socketId,
      isMuted: peerMuted,
      isVideoOff: peerVideoOff,
    }: {
      socketId: string;
      isMuted: boolean;
      isVideoOff: boolean;
    }) => {
      setRemotePeers((prev) => {
        const updated = new Map(prev);
        const peer = updated.get(socketId);
        if (peer) {
          updated.set(socketId, {
            ...peer,
            isMuted: peerMuted,
            isVideoOff: peerVideoOff,
          });
        }
        return updated;
      });
    };

    const handleUserStartedScreenShare = ({
      socketId,
      userName,
    }: {
      socketId: string;
      userName: string;
    }) => {
      setActiveScreenSharer({ socketId, userName });
      toast.info(`📺 ${userName} started sharing their screen`);
    };

    const handleUserStoppedScreenShare = ({
      socketId,
    }: {
      socketId: string;
    }) => {
      setActiveScreenSharer((prev) => (prev?.socketId === socketId ? null : prev));
      toast.info("Screen sharing ended");
    };

    const handleRecordingStatusChanged = ({
      isRecording: recStatus,
      hostName,
    }: {
      isRecording: boolean;
      hostName?: string;
    }) => {
      setIsRecording(recStatus);
      if (recStatus && hostName) {
        toast.info(`🔴 Session recording started by Host (${hostName})`);
      } else if (!recStatus) {
        toast.info("Session recording ended.");
      }
    };

    socket.on("existing_video_participants", handleExistingParticipants);
    socket.on("user_joined_video_call", handleUserJoinedCall);
    socket.on("user_left_video_call", handleUserLeftCall);
    socket.on("webrtc_signal", handleWebRTCSignal);
    socket.on("media_state_changed", handleMediaStateChanged);
    socket.on("user_started_screen_share", handleUserStartedScreenShare);
    socket.on("user_stopped_screen_share", handleUserStoppedScreenShare);
    socket.on("recording_status_changed", handleRecordingStatusChanged);

    return () => {
      socket.off("existing_video_participants", handleExistingParticipants);
      socket.off("user_joined_video_call", handleUserJoinedCall);
      socket.off("user_left_video_call", handleUserLeftCall);
      socket.off("webrtc_signal", handleWebRTCSignal);
      socket.off("media_state_changed", handleMediaStateChanged);
      socket.off("user_started_screen_share", handleUserStartedScreenShare);
      socket.off("user_stopped_screen_share", handleUserStoppedScreenShare);
      socket.off("recording_status_changed", handleRecordingStatusChanged);
    };
  }, [socket, createPeerConnection, removePeerConnection, participants]);

  // Join Call Action
  const handleJoinCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setLocalStream(stream);
      setIsCallActive(true);
      setIsMuted(false);
      setIsVideoOff(false);

      socket.emit("join_video_call", { roomId });
      toast.success("Joined video call!");
    } catch (err: any) {
      console.error("Failed to access camera/microphone:", err);
      toast.error("Failed to access camera/microphone permissions.");
    }
  };

  // Screen Share Actions
  const handleStopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
    }
    setScreenStream(null);

    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] || null;

    peerConnections.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender && cameraTrack) {
        sender.replaceTrack(cameraTrack);
      }
    });

    setIsScreenSharing(false);
    setActiveScreenSharer(null);
    socket.emit("stop_screen_share", { roomId });
    toast.info("Stopped screen sharing.");
  }, [screenStream, socket, roomId]);

  const handleStartScreenShare = async () => {
    if (!isCallActive) {
      toast.error("Please join the video call first to share your screen.");
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const screenTrack = displayStream.getVideoTracks()[0];

      // Replace camera track with screen share track on peer connections
      peerConnections.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });

      screenTrack.onended = () => {
        handleStopScreenShare();
      };

      setScreenStream(displayStream);
      setIsScreenSharing(true);
      const myName = currentUser?.name || currentUser?.userName || "You";
      setActiveScreenSharer({ socketId: socket.id || "", userName: myName });
      socket.emit("start_screen_share", { roomId });
      toast.success("Started screen sharing!");
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        console.error("Error starting screen share:", err);
        toast.error("Failed to start screen share.");
      }
    }
  };

  // Session Recording Actions (Host Only)
  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    mediaRecorderRef.current = null;
    setIsRecordingHost(false);
    socket.emit("stop_recording", { roomId });
  }, [socket, roomId]);

  const handleStartRecording = async () => {
    if (!isHost) {
      toast.error("Only the Watch Party Host can record the session.");
      return;
    }

    try {
      const captureStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      recordedChunksRef.current = [];
      const options = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? { mimeType: "video/webm;codecs=vp9,opus" }
        : MediaRecorder.isTypeSupported("video/webm")
        ? { mimeType: "video/webm" }
        : undefined;

      const recorder = new MediaRecorder(captureStream, options);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `WatchParty_Recording_${roomId}_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);

        toast.success("Session recording saved to your local downloads!");
      };

      captureStream.getVideoTracks()[0].onended = () => {
        handleStopRecording();
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecordingHost(true);

      socket.emit("start_recording", { roomId });
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        console.error("Failed to start session recording:", err);
        toast.error("Failed to start session recording.");
      }
    }
  };

  // Leave Call Action
  const handleLeaveCall = () => {
    if (isRecordingHost) {
      handleStopRecording();
    }
    if (isScreenSharing) {
      handleStopScreenShare();
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);

    // Close all peer connections
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    setRemotePeers(new Map());

    socket.emit("leave_video_call", { roomId });
    setIsCallActive(false);
    toast.info("Left video call.");
  };

  // Toggle Microphone
  const handleToggleMic = () => {
    if (!localStream) return;
    const nextMute = !isMuted;
    localStream.getAudioTracks().forEach((t) => (t.enabled = !nextMute));
    setIsMuted(nextMute);
    socket.emit("toggle_media_state", {
      roomId,
      isMuted: nextMute,
      isVideoOff,
    });
  };

  // Toggle Camera
  const handleToggleCamera = () => {
    if (!localStream) return;
    const nextVideoOff = !isVideoOff;
    localStream.getVideoTracks().forEach((t) => (t.enabled = !nextVideoOff));
    setIsVideoOff(nextVideoOff);
    socket.emit("toggle_media_state", {
      roomId,
      isMuted,
      isVideoOff: nextVideoOff,
    });
  };

  const remotePeerList = Array.from(remotePeers.values());

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl space-y-4">
      {/* Top Header & Join/Leave Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-800/40 text-purple-400">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Face-to-Face Video Call
              </h3>
              {isRecording && (
                <span className="flex items-center space-x-1 bg-red-950/80 border border-red-800/60 text-red-400 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                  <CircleDot className="w-3 h-3 text-red-500 fill-current" />
                  <span>REC</span>
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              {isCallActive
                ? `${remotePeerList.length + 1} participant(s) in call`
                : "Connect with friends live during Watch Party"}
            </p>
          </div>
        </div>

        {!isCallActive ? (
          <button
            onClick={handleJoinCall}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-lg transition-all active:scale-95"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Join Call</span>
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleMic}
              className={`p-2 rounded-xl border transition-all ${
                isMuted
                  ? "bg-red-500/20 border-red-500/40 text-red-400"
                  : "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
              }`}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={handleToggleCamera}
              className={`p-2 rounded-xl border transition-all ${
                isVideoOff
                  ? "bg-red-500/20 border-red-500/40 text-red-400"
                  : "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
              }`}
              title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
            >
              {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </button>

            {!isScreenSharing ? (
              <button
                onClick={handleStartScreenShare}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-all active:scale-95 shadow-md"
                title="Share Screen"
              >
                <MonitorUp className="w-4 h-4" />
                <span>Share Screen</span>
              </button>
            ) : (
              <button
                onClick={handleStopScreenShare}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-all active:scale-95 shadow-md animate-pulse"
                title="Stop Sharing Screen"
              >
                <MonitorOff className="w-4 h-4" />
                <span>Stop Sharing</span>
              </button>
            )}

            {/* Host-only Session Recording Button */}
            {isHost && (
              !isRecordingHost ? (
                <button
                  onClick={handleStartRecording}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 text-white font-semibold text-xs border border-red-800/60 shadow-md transition-all active:scale-95"
                  title="Record Session (Host Only)"
                >
                  <CircleDot className="w-4 h-4 text-red-500 fill-current" />
                  <span>Record</span>
                </button>
              ) : (
                <button
                  onClick={handleStopRecording}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md transition-all active:scale-95 animate-pulse"
                  title="Stop Session Recording"
                >
                  <Square className="w-4 h-4 fill-current text-white" />
                  <span>Stop REC</span>
                </button>
              )
            )}

            <button
              onClick={() => setShowParticipantModal(!showParticipantModal)}
              className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-xl border transition-all ${
                showParticipantModal
                  ? "bg-purple-600 text-white border-purple-500"
                  : "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
              }`}
              title="View Participant List"
            >
              <Users className="w-4 h-4" />
              <span className="text-xs font-semibold">{participants.length}</span>
            </button>

            <button
              onClick={handleLeaveCall}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all active:scale-95 shadow-md"
              title="Leave Video Call"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Leave Call</span>
            </button>
          </div>
        )}
      </div>

      {/* Participant List Quick Modal Overlay */}
      {showParticipantModal && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-2.5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Call Participants ({participants.length})</span>
            </h4>
            <button
              onClick={() => setShowParticipantModal(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {participants.map((p) => {
              const remotePeer = remotePeers.get(p.socketId);
              const isSelf = p.socketId === socket.id;
              const pMuted = isSelf ? isMuted : remotePeer?.isMuted;
              const pVideoOff = isSelf ? isVideoOff : remotePeer?.isVideoOff;

              return (
                <div
                  key={p.socketId}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={p.userAvatar} />
                      <AvatarFallback className="bg-purple-900 text-purple-200 font-bold text-[10px]">
                        {p.userName?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-zinc-200 truncate">
                      {p.userName} {isSelf && "(You)"}
                    </span>
                    {p.isHost && (
                      <Crown className="w-3 h-3 text-amber-400 shrink-0 fill-current" />
                    )}
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <span title={pMuted ? "Muted" : "Mic On"}>
                      {pMuted ? (
                        <MicOff className="w-3 h-3 text-red-400" />
                      ) : (
                        <Mic className="w-3 h-3 text-emerald-400" />
                      )}
                    </span>
                    <span title={pVideoOff ? "Camera Off" : "Camera On"}>
                      {pVideoOff ? (
                        <VideoOff className="w-3 h-3 text-red-400" />
                      ) : (
                        <Video className="w-3 h-3 text-purple-400" />
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Featured Screen Share Tile */}
      {isCallActive && activeScreenSharer && (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border-2 border-purple-500 shadow-2xl space-y-2 my-2">
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
          <div className="absolute top-3 left-3 bg-purple-950/90 backdrop-blur-md border border-purple-500/50 px-3 py-1.5 rounded-xl flex items-center space-x-2 text-xs font-bold text-purple-200">
            <MonitorUp className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>Screen Share: {activeScreenSharer.userName}</span>
          </div>
        </div>
      )}

      {/* Video Call Streams Grid */}
      {isCallActive && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* Local User Stream Tile */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-purple-500/40 shadow-lg group">
            {localStream && !isVideoOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100 rounded-xl"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-purple-950/40 to-zinc-900 p-4">
                <Avatar className="w-14 h-14 border-2 border-purple-500/60 shadow-xl">
                  <AvatarImage src={currentUser?.avatar} />
                  <AvatarFallback className="bg-purple-900 text-purple-200 font-bold text-lg">
                    {currentUser?.name?.[0]?.toUpperCase() || "YOU"}
                  </AvatarFallback>
                </Avatar>
                <span className="mt-2 text-xs font-semibold text-purple-300">
                  You (Camera Off)
                </span>
              </div>
            )}

            {/* Local Overlay Bar */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-purple-500/30 text-xs">
              <span className="font-semibold text-purple-300 truncate">
                You {currentUser?.name ? `(${currentUser.name})` : ""}
              </span>
              <div className="flex items-center space-x-1">
                {isMuted ? (
                  <span className="p-1 rounded bg-red-500/80 text-white" title="Muted">
                    <MicOff className="w-3 h-3" />
                  </span>
                ) : (
                  <span className="p-1 rounded bg-emerald-500/80 text-white" title="Microphone On">
                    <Mic className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Remote Peer Streams */}
          {remotePeerList.map((peer) => (
            <RemoteVideoTile key={peer.socketId} peer={peer} />
          ))}
        </div>
      )}
    </div>
  );
}
