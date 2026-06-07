import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js"

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  // When a receiver acknowledges delivery of a message
	socket.on("messageDelivered", async ({ messageId }) => {
		try {
			const updated = await Message.findByIdAndUpdate(
				messageId,
				{ deliveredAt: new Date(), status: "delivered" },
				{ new: true }
			);
      const senderIdStr = String(updated.messageId);
			const senderSocketId = userSocketMap[senderIdStr];
			if (senderSocketId) io.to(senderSocketId).emit("messageDelivered", updated);
		} catch (err) {
			console.error("Error marking message delivered:", err.message);
		}
	});

	// When a receiver marks a message as read
	socket.on("messageRead", async ({ messageId }) => {
		try {
			const updated = await Message.findByIdAndUpdate(
				messageId,
				{ readAt: new Date(), status: "read" },
				{ new: true }
			);
			if (!updated) return;
			const senderIdStr = String(updated.senderId);
			const senderSocketId = userSocketMap[senderIdStr];
			if (senderSocketId) io.to(senderSocketId).emit("messageRead", updated);
		} catch (err) {
			console.error("Error marking message read:", err.message);
		}
	});
});

export { io, app, server };
