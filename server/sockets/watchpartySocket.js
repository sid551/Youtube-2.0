import { Server } from "socket.io";

// In-memory store for Watch Party rooms
// Key: roomId -> Value: room details
const rooms = new Map();
// Map to store cleanup timers for empty rooms
const roomCleanupTimers = new Map();

function generateRoomId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function setupWatchPartySockets(io) {
  io.on("connection", (socket) => {
    console.log(`[WatchParty] Client connected: ${socket.id}`);

    // Create a new Watch Party
    socket.on("create_party", ({ video, user }) => {
      try {
        const roomId = generateRoomId();
        const participant = {
          socketId: socket.id,
          userId: user?._id || socket.id,
          userName: user?.name || user?.username || "Guest Host",
          userAvatar: user?.avatar || "",
          isHost: true,
        };

        const roomData = {
          roomId,
          video,
          hostId: participant.userId,
          hostName: participant.userName,
          participants: new Map([[socket.id, participant]]),
          currentTime: 0,
          isPlaying: false,
          lastStateUpdate: Date.now(),
          chatMessages: [
            {
              id: Date.now().toString(),
              type: "system",
              message: `Watch party created by ${participant.userName}!`,
              timestamp: Date.now(),
            },
          ],
        };

        rooms.set(roomId, roomData);
        socket.join(roomId);
        socket.roomId = roomId;

        console.log(`[WatchParty] Room created: ${roomId} by ${participant.userName}`);

        socket.emit("party_created", {
          roomId,
          video,
          host: participant,
        });
      } catch (err) {
        console.error("[WatchParty] Error creating party:", err);
        socket.emit("party_error", { message: "Failed to create watch party room." });
      }
    });

    // Join an existing Watch Party
    socket.on("join_party", ({ roomId, user }) => {
      try {
        const room = rooms.get(roomId);

        if (!room) {
          socket.emit("party_error", { message: "Watch Party session not found or has ended." });
          return;
        }

        // Cancel cleanup timer if room was marked empty
        if (roomCleanupTimers.has(roomId)) {
          clearTimeout(roomCleanupTimers.get(roomId));
          roomCleanupTimers.delete(roomId);
          console.log(`[WatchParty] Room ${roomId} re-activated from grace period.`);
        }

        const isHost = room.participants.size === 0 || room.hostId === (user?._id || socket.id);
        const participant = {
          socketId: socket.id,
          userId: user?._id || socket.id,
          userName: user?.name || user?.username || `Viewer #${room.participants.size + 1}`,
          userAvatar: user?.avatar || "",
          isHost,
        };

        if (isHost && !room.hostId) {
          room.hostId = participant.userId;
          room.hostName = participant.userName;
        }

        room.participants.set(socket.id, participant);
        socket.join(roomId);
        socket.roomId = roomId;

        // Calculate estimated current playback time if playing
        let currentComputedTime = room.currentTime;
        if (room.isPlaying && room.lastStateUpdate) {
          const elapsed = (Date.now() - room.lastStateUpdate) / 1000;
          currentComputedTime += elapsed;
        }

        const systemMsg = {
          id: Date.now().toString(),
          type: "system",
          message: `${participant.userName} joined the party 🎉`,
          timestamp: Date.now(),
        };
        room.chatMessages.push(systemMsg);
        if (room.chatMessages.length > 100) room.chatMessages.shift();

        const participantsList = Array.from(room.participants.values());

        // Send full room state to the newly joined user
        socket.emit("party_joined", {
          roomId: room.roomId,
          video: room.video,
          hostId: room.hostId,
          hostName: room.hostName,
          participants: participantsList,
          currentTime: currentComputedTime,
          isPlaying: room.isPlaying,
          isRecording: room.isRecording || false,
          chatMessages: room.chatMessages,
        });

        // Notify other participants in room
        socket.to(roomId).emit("user_joined", {
          user: participant,
          participants: participantsList,
          systemMessage: systemMsg,
        });

        console.log(`[WatchParty] ${participant.userName} joined room: ${roomId}`);
      } catch (err) {
        console.error("[WatchParty] Error joining party:", err);
        socket.emit("party_error", { message: "Failed to join watch party." });
      }
    });

    // Handle Play / Pause / Seek Sync Actions (Host Controlled)
    socket.on("video_action", ({ roomId, action, currentTime, isPlaying }) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return;

        const participant = room.participants.get(socket.id);
        if (!participant) return;

        // Verify if sender is host or if participant is host
        const isHost = participant.isHost || room.hostId === participant.userId;

        // Master playback state update
        room.currentTime = currentTime;
        room.isPlaying = isPlaying;
        room.lastStateUpdate = Date.now();

        let actionText = "";
        if (action === "play") actionText = "started playback";
        else if (action === "pause") actionText = "paused playback";
        else if (action === "seek") {
          const minutes = Math.floor(currentTime / 60);
          const seconds = Math.floor(currentTime % 60).toString().padStart(2, "0");
          actionText = `seeked to ${minutes}:${seconds}`;
        }

        const systemMsg = {
          id: Date.now().toString(),
          type: "system",
          message: `${participant.userName} ${isHost ? "(Host)" : ""} ${actionText}`,
          timestamp: Date.now(),
        };

        room.chatMessages.push(systemMsg);
        if (room.chatMessages.length > 100) room.chatMessages.shift();

        // Broadcast to everyone in the room
        io.to(roomId).emit("video_state_changed", {
          action,
          currentTime,
          isPlaying,
          senderId: socket.id,
          senderName: participant.userName,
          isHost,
          systemMessage: systemMsg,
        });
      } catch (err) {
        console.error("[WatchParty] Error on video_action:", err);
      }
    });

    // Request sync from host/room
    socket.on("request_sync", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      let currentComputedTime = room.currentTime;
      if (room.isPlaying && room.lastStateUpdate) {
        const elapsed = (Date.now() - room.lastStateUpdate) / 1000;
        currentComputedTime += elapsed;
      }

      socket.emit("sync_state", {
        currentTime: currentComputedTime,
        isPlaying: room.isPlaying,
      });
    });

    // Real-time Chat
    socket.on("send_chat", ({ roomId, message }) => {
      try {
        const room = rooms.get(roomId);
        if (!room || !message.trim()) return;

        const participant = room.participants.get(socket.id);
        if (!participant) return;

        const chatMsg = {
          id: Date.now().toString(),
          type: "user",
          senderId: participant.userId,
          senderName: participant.userName,
          senderAvatar: participant.userAvatar,
          isHost: participant.isHost,
          message: message.trim(),
          timestamp: Date.now(),
        };

        room.chatMessages.push(chatMsg);
        if (room.chatMessages.length > 100) room.chatMessages.shift();

        io.to(roomId).emit("new_chat_message", chatMsg);
      } catch (err) {
        console.error("[WatchParty] Error sending chat:", err);
      }
    });

    // Real-time Emoji Reactions
    socket.on("send_reaction", ({ roomId, emoji }) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return;

        const participant = room.participants.get(socket.id);
        if (!participant) return;

        io.to(roomId).emit("new_reaction", {
          id: Date.now() + Math.random().toString(),
          emoji,
          userName: participant.userName,
          socketId: socket.id,
        });
      } catch (err) {
        console.error("[WatchParty] Error sending reaction:", err);
      }
    });

    // WebRTC Video Call Signaling Events
    socket.on("join_video_call", ({ roomId }) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return;

        if (!room.videoCallParticipants) {
          room.videoCallParticipants = new Set();
        }
        room.videoCallParticipants.add(socket.id);

        const participant = room.participants.get(socket.id);
        const existingCallUsers = Array.from(room.videoCallParticipants)
          .filter((id) => id !== socket.id)
          .map((id) => {
            const p = room.participants.get(id);
            return { socketId: id, user: p };
          });

        // Send existing video call users to newly joined participant
        socket.emit("existing_video_participants", existingCallUsers);

        // Notify existing members in room that this user joined video call
        socket.to(roomId).emit("user_joined_video_call", {
          socketId: socket.id,
          user: participant,
        });

        console.log(`[WatchParty] User ${socket.id} (${participant?.userName}) joined video call in room ${roomId}`);
      } catch (err) {
        console.error("[WatchParty] Error joining video call:", err);
      }
    });

    const handleLeaveVideoCall = () => {
      handleStopScreenShare();
      const roomId = socket.roomId;
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room || !room.videoCallParticipants) return;

      if (room.videoCallParticipants.has(socket.id)) {
        room.videoCallParticipants.delete(socket.id);
        io.to(roomId).emit("user_left_video_call", {
          socketId: socket.id,
        });
        console.log(`[WatchParty] User ${socket.id} left video call in room ${roomId}`);
      }
    };

    socket.on("leave_video_call", handleLeaveVideoCall);

    socket.on("webrtc_signal", ({ targetSocketId, signal }) => {
      try {
        io.to(targetSocketId).emit("webrtc_signal", {
          senderSocketId: socket.id,
          signal,
        });
      } catch (err) {
        console.error("[WatchParty] Error forwarding WebRTC signal:", err);
      }
    });

    socket.on("toggle_media_state", ({ roomId, isMuted, isVideoOff }) => {
      try {
        socket.to(roomId).emit("media_state_changed", {
          socketId: socket.id,
          isMuted,
          isVideoOff,
        });
      } catch (err) {
        console.error("[WatchParty] Error on toggle_media_state:", err);
      }
    });

    // Screen Sharing Socket Handlers
    socket.on("start_screen_share", ({ roomId }) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return;

        const participant = room.participants.get(socket.id);
        const userName = participant ? participant.userName : "A participant";
        room.activeScreenShare = { socketId: socket.id, userName };

        io.to(roomId).emit("user_started_screen_share", {
          socketId: socket.id,
          userName,
        });
        console.log(`[WatchParty] User ${socket.id} (${userName}) started screen sharing in room ${roomId}`);
      } catch (err) {
        console.error("[WatchParty] Error on start_screen_share:", err);
      }
    });

    const handleStopScreenShare = () => {
      const roomId = socket.roomId;
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      if (room.activeScreenShare?.socketId === socket.id) {
        room.activeScreenShare = null;
        io.to(roomId).emit("user_stopped_screen_share", {
          socketId: socket.id,
        });
        console.log(`[WatchParty] User ${socket.id} stopped screen sharing in room ${roomId}`);
      }
    };

    socket.on("stop_screen_share", handleStopScreenShare);

    // Session Recording Handlers (Host Only)
    socket.on("start_recording", ({ roomId }) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return;

        const participant = room.participants.get(socket.id);
        const isHost = participant?.isHost || room.hostId === participant?.userId;

        if (!isHost) {
          socket.emit("party_error", { message: "Only the host can start session recording." });
          return;
        }

        room.isRecording = true;
        io.to(roomId).emit("recording_status_changed", {
          isRecording: true,
          hostName: participant?.userName || "Host",
        });
        console.log(`[WatchParty] Host ${participant?.userName} started session recording in room ${roomId}`);
      } catch (err) {
        console.error("[WatchParty] Error on start_recording:", err);
      }
    });

    socket.on("stop_recording", ({ roomId }) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return;

        const participant = room.participants.get(socket.id);
        const isHost = participant?.isHost || room.hostId === participant?.userId;

        if (!isHost) return;

        room.isRecording = false;
        io.to(roomId).emit("recording_status_changed", {
          isRecording: false,
        });
        console.log(`[WatchParty] Host ${participant?.userName} stopped session recording in room ${roomId}`);
      } catch (err) {
        console.error("[WatchParty] Error on stop_recording:", err);
      }
    });

    // User leaving party or disconnecting
    const handleLeave = () => {
      handleLeaveVideoCall();
      const roomId = socket.roomId;
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const participant = room.participants.get(socket.id);
      const userName = participant ? participant.userName : "A user";

      room.participants.delete(socket.id);

      if (room.participants.size === 0) {
        // Schedule deletion timer (15 min grace period) instead of deleting immediately
        if (!roomCleanupTimers.has(roomId)) {
          const timer = setTimeout(() => {
            rooms.delete(roomId);
            roomCleanupTimers.delete(roomId);
            console.log(`[WatchParty] Room ${roomId} expired and deleted.`);
          }, 15 * 60 * 1000);
          roomCleanupTimers.set(roomId, timer);
          console.log(`[WatchParty] Room ${roomId} empty, 15m grace period started.`);
        }
      } else {
        let hostId = room.hostId;
        let hostName = room.hostName;

        if (participant?.isHost) {
          const nextParticipant = room.participants.values().next().value;
          if (nextParticipant) {
            nextParticipant.isHost = true;
            room.hostId = nextParticipant.userId;
            room.hostName = nextParticipant.userName;
            hostId = nextParticipant.userId;
            hostName = nextParticipant.userName;
          }
        }

        const systemMsg = {
          id: Date.now().toString(),
          type: "system",
          message: `${userName} left the party 👋`,
          timestamp: Date.now(),
        };
        room.chatMessages.push(systemMsg);

        const participantsList = Array.from(room.participants.values());

        io.to(roomId).emit("user_left", {
          leftUser: participant,
          hostId,
          hostName,
          participants: participantsList,
          systemMessage: systemMsg,
        });
      }
    };

    socket.on("leave_party", handleLeave);
    socket.on("disconnect", handleLeave);
  });
}
