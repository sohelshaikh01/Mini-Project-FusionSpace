import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

import {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUserProfile,
    getUserProfile,
    updateMyProfile,
    getUserPosts,
} from "../controllers/user.controller.js";

const router = Router();

// public
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }
    ]),
    registerUser);
// public
router.route("/login").post(loginUser);
// auth
router.route("/logout").post(verifyJWT, logoutUser);

// auth
router.route("/me").get(verifyJWT, getCurrentUserProfile);
// auth update profile
router.route("/me").patch(verifyJWT, updateMyProfile);

// public
router.route("/:userId").get(getUserProfile);
// public - public posts only
router.route("/:userId/post").get(getUserPosts);




export default router;