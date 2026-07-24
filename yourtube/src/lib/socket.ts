import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    socket = io(backendUrl, {
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
};
