import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

import notificationSound from "../assets/sounds/notification.mp3";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.message);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const audio = new Audio(notificationSound);
      audio.play();
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });

      // Notify server that this client received the message (delivered)
      socket.emit("messageDelivered", { messageId: newMessage._id });

      // Mark message as read immediately when viewing it
      socket.emit("messageRead", { messageId: newMessage._id });
    });

    // create message read listener
    socket.on("messageRead", (updatedMessage) => {
      set({
        messages: get().messages.map((msg) =>
          msg._id === updatedMessage._id ? { ...msg, status: updatedMessage.status, readAt: updatedMessage.readAt } : msg
        ),
      });
    });

    // create message delivered listener
    socket.on("messageDelivered", (updatedMessage) => {
      set({
        messages: get().messages.map((msg) =>
          msg._id === updatedMessage._id ? { ...msg, status: updatedMessage.status, deliveredAt: updatedMessage.deliveredAt } : msg
        ),
      });
    });
  },

  markMessagesAsRead: () => {
    const { messages, selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    // Mark all unread messages from selected user as read
    messages.forEach((msg) => {
      if (msg.senderId === selectedUser._id && msg.status !== "read") {
        socket.emit("messageRead", { messageId: msg._id });
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageDelivered");
    socket.off("messageRead");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
