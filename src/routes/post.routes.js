import { Router } from "express";
import {
    getPosts,
    publishAPost,
    getPostById,
    updateAPost,
    deleteAPost,
    togglePublishStatus,
    searchPost
} from "../controllers/post.controller.js";

const router = Router();

// public + auth
router.route("/").get(getPosts);
// auth
router.route("/").post(publishAPost);
// public + auth if private post.comm == user.comm || owner == user
router.route("/:postId").get(getPostById);
// auth
router.route("/:postId").patch(updateAPost);
// auth
router.route("/:postId").delete(deleteAPost);
// auth
router.route("/publish/:postId").patch(togglePublishStatus);
// public - public things only
router.route("/search").get(searchPost);


export default router;