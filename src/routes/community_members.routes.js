import { Router } from "express";
import {
    joinCommunity,
    leftCommunity,
    getCommunityMembers
} from "../controllers/community_members.controller.js";

const router = Router();

// auth 
router.route("/:communityId/joins").post(joinCommunity);
// auth
router.route("/:communityId/joins").delete(leftCommunity);
// auth + only for members
router.route("/:commnunityId/members").get(getCommunityMembers);


export default router;