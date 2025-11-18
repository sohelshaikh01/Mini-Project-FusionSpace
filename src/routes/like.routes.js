import { Router } from "express";
import {
    togglePostLike,
    deletePostLike,
    toggleCommentLike,
    deleteCommentLike
} from "../controllers/like.controller.js";

const router = Router();

// auth all
router.route("/toggle/p/:postId")
    .post(togglePostLike)
router.route("/toggle/c/:commentId")
    .post(toggleCommentLike)


export default router;