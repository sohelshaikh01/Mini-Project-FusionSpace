import { Router } from "express";
import {
    feed,
    explore,
    trending
} from "../controllers/discovery.controller.js";

const router = Router();

// This must have aggregation
// auth following + communities posts
router.route("/feed").get(feed); // sort used in front
// public + post / comm
router.route("/explore").get(explore);
// public most liked
router.route("/trending").get(trending);


export default router;