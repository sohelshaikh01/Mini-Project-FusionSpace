import { Router } from "express";
import {
    getPosts,
    publishAPost,
    getPostById,
    updateAPost,
    deleteAPost,
    togglePublishStatus,
    // getUserPublicPosts
} from "../controllers/post.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// public + auth 
router.route("/").get(verifyJWT, getPosts);

// auth
router.route("/").post(verifyJWT, 
    upload.fields([
        {
            name: "imageFile",
            maxCount: 1
        }
    ]), publishAPost);

// public + auth if private post.comm == user.comm || owner == user
router.route("/:postId").get(verifyJWT, getPostById);

// auth
router.route("/:postId").patch(verifyJWT,
    upload.fields([
        {
            name: "imageFile",
            maxCount: 1
        }
    ]), updateAPost);

// auth
router.route("/:postId").delete(verifyJWT, deleteAPost);

// auth
router.route("/publish/:postId").patch(verifyJWT, togglePublishStatus);

// Used in user routes.
// router.route("/:userId/posts").get(getUserPublicPosts);

export default router;