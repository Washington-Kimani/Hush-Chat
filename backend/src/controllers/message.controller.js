import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import streamifier from "streamifier";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    // text may come from form-data field or JSON
    const text = req.body.text || req.body?.message || "";
    const imageBase64 = req.body.image;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    // If a file was uploaded via multer (memory storage), stream it to Cloudinary
    if (req.file && req.file.buffer) {
      const uploadFromBuffer = (buffer) => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream({ folder: "hush_chat/messages" }, (error, result) => {
            if (error) return reject(error);
            resolve(result);
          });
          streamifier.createReadStream(buffer).pipe(uploadStream);
        });
      };

      const result = await uploadFromBuffer(req.file.buffer);
      imageUrl = result.secure_url;
    } else if (imageBase64) {
      // Fallback: upload base64 image (legacy)
      const uploadResponse = await cloudinary.uploader.upload(imageBase64);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
