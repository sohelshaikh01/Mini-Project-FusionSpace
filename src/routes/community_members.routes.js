import { Router } from "express";
import {
    joinCommunity,
    leaveCommunity,
    getCommunityMembers
} from "../controllers/community_members.controller.js";

import isCommunityMember from "../middlewares/isCommunityMember.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// auth 
router.route("/:communityId/joins").post(verifyJWT, joinCommunity);

// auth
router.route("/:communityId/joins").delete(verifyJWT, leaveCommunity);

// auth + only for members
router.route("/:commnunityId/members").get(verifyJWT, isCommunityMember, getCommunityMembers);


export default router;