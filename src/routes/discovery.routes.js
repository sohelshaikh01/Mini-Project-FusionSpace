import { Router } from "express";
import {
    feed,
    exploreFeed,
    trending
} from "../controllers/discovery.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

 // sort used in front
// auth following + communities posts
router.route("/feed").get(verifyJWT, feed);

// public + post / comm
router.route("/explore").get(verifyJWT, exploreFeed);

// public most liked
router.route("/trending").get(trending);

export default router;