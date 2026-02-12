import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectAdminSocket() {
  if (socket) return socket;

  const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

  const token = localStorage.getItem("accessToken");

  socket = io(baseUrl, {
    transports: ["websocket", "polling"],
    auth: { token },
    withCredentials: true,
  });

  return socket;
}

export function disconnectAdminSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
