import express from "express";
import multer from "multer";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage } from "../controllers/message.controller.js";

const router = express.Router();

// Use memory storage so files are available as buffers for streaming to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);

// Accept optional multipart/form-data image under field name 'image'
router.post("/send/:id", protectRoute, upload.single('image'), sendMessage);

export default router;
