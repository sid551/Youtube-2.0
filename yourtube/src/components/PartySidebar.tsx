"use client";

import React, { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Send,
  Users,
  MessageSquare,
  Crown,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface Participant {
  socketId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  isHost?: boolean;
}

interface ChatMessage {
  id: string;
  type: "user" | "system";
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  isHost?: boolean;
  message: string;
  timestamp: number;
}

interface PartySidebarProps {
  roomId: string;
  socket: Socket;
  participants: Participant[];
  chatMessages: ChatMessage[];
  hostId?: string;
  videoTitle?: string;
  onSendReaction: (emoji: string) => void;
}

export default function PartySidebar({
  roomId,
  socket,
  participants,
  chatMessages,
  hostId,
  videoTitle,
  onSendReaction,
}: PartySidebarProps) {
  const [copied, setCopied] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "members">("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/watch-party/${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Watch party invite link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket) return;
    socket.emit("send_chat", { roomId, message: inputMessage });
    setInputMessage("");
  };

  const EMOJIS = ["🎉", "❤️", "😂", "😮", "👏", "🔥"];

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl text-white">
      {/* Header with Room Invite & Copy */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-950/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-800/40 text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Watch Party
              </h2>
              <p className="text-xs text-zinc-400 font-mono">Room ID: {roomId}</p>
            </div>
          </div>

          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Invite"}</span>
          </button>
        </div>

        {videoTitle && (
          <p className="text-xs text-zinc-400 line-clamp-1 font-medium bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-zinc-800/60">
            🎬 {videoTitle}
          </p>
        )}

        {/* Tab Switcher */}
        <div className="flex bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "chat"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat ({chatMessages.filter((m) => m.type === "user").length})</span>
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "members"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Party Members ({participants.length})</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[500px]">
        {activeTab === "chat" ? (
          <>
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
                <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
                <p className="text-xs font-medium">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              chatMessages.map((msg) =>
                msg.type === "system" ? (
                  <div
                    key={msg.id}
                    className="text-center my-2 text-[11px] text-purple-300/80 bg-purple-950/30 border border-purple-800/20 py-1 px-3 rounded-full font-medium italic"
                  >
                    {msg.message}
                  </div>
                ) : (
                  <div key={msg.id} className="flex items-start space-x-2.5">
                    <Avatar className="w-7 h-7 border border-zinc-700 mt-0.5">
                      <AvatarImage src={msg.senderAvatar} />
                      <AvatarFallback className="bg-purple-900 text-purple-200 text-xs font-bold">
                        {msg.senderName?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-semibold text-zinc-200">
                          {msg.senderName}
                        </span>
                        {msg.isHost && (
                          <span className="flex items-center text-[10px] text-amber-400 font-bold bg-amber-950/70 border border-amber-800/50 px-1.5 py-0.2 rounded">
                            <Crown className="w-2.5 h-2.5 mr-0.5 fill-current" /> HOST
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="bg-zinc-800/90 text-zinc-100 text-xs px-3 py-2 rounded-2xl rounded-tl-none border border-zinc-700/50 max-w-[90%] break-words">
                        {msg.message}
                      </div>
                    </div>
                  </div>
                )
              )
            )}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="space-y-2">
            {participants.map((p) => (
              <div
                key={p.socketId}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8 border border-purple-500/40">
                    <AvatarImage src={p.userAvatar} />
                    <AvatarFallback className="bg-purple-950 text-purple-300 font-bold text-xs">
                      {p.userName?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-bold text-zinc-100 flex items-center">
                      {p.userName}
                    </p>
                    <p className="text-[10px] text-emerald-400 flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1"></span>
                      Active in Party
                    </p>
                  </div>
                </div>
                {p.isHost && (
                  <span className="flex items-center text-[10px] text-amber-400 font-bold bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3 mr-1 fill-current text-amber-400" /> Host
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Reaction Buttons */}
      <div className="p-2 border-t border-zinc-800 bg-zinc-950/40 flex items-center justify-around">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendReaction(emoji)}
            className="text-lg hover:scale-130 transition-transform active:scale-90 p-1"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Chat Input Form */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 bg-zinc-950/80 flex items-center space-x-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Send a message to party..."
          className="flex-1 bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-purple-500 transition-colors placeholder:text-zinc-500"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim()}
          className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white transition-all active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
