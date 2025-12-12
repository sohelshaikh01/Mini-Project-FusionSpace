import { Router } from "express";
import {
    togglePostLike,
    toggleCommentLike,
} from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// auth all
router.route("/toggle/p/:postId")
    .post(verifyJWT, togglePostLike)
router.route("/toggle/c/:commentId")
    .post(verifyJWT, toggleCommentLike)


export default router;