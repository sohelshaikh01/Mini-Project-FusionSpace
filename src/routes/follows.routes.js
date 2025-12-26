import { Router } from "express";
import {
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing
} from "../controllers/follows.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router
    .route("/:userId")
    .post(verifyJWT, followUser)
    .delete(verifyJWT, unfollowUser); // auth
    
// public
router.route("/:userId/followers").get(getFollowers);
router.route("/:userId/following").get(getFollowing);


export default router;