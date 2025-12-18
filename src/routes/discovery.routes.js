import { Router } from "express";
import {
    feed,
    exploreFeed,
    trending
} from "../controllers/discovery.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

// This must have aggregation
// auth following + communities posts
router.route("/feed").get(verifyJWT, feed); // sort used in front

// public + post / comm
router.route("/explore").get(verifyJWT, exploreFeed);

// public most liked
router.route("/trending").get(trending);

export default router;