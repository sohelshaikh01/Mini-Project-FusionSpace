import { Router } from "express";
import {
    // replyComment,
    createComment,
    getComments,
    editComment,
    deleteComment
} from "../controllers/comment.controller.js";

const router = Router();

// auth
router.route("/:postId").post(createComment);
// public
router.route("/:postId").get(getComments);
// auth owner only
router.route("/:commentId").patch(editComment);
// auth owner only
router.route("/:commentId").delete(deleteComment);
// auth
// router.route("/:commentId/reply").post(replyComment);


export default router;