import { Router } from "express";
import {
    // replyComment,
    createComment,
    getComments,
    editComment,
    deleteComment
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// auth
router.route("/:postId").post(verifyJWT, createComment);
// public
router.route("/:postId").get(getComments);
// auth owner only
router.route("/:commentId").patch(verifyJWT, editComment);
// auth owner only
router.route("/:commentId").delete(verifyJWT, deleteComment);
// auth
// router.route("/:commentId/reply").post(replyComment);


export default router;