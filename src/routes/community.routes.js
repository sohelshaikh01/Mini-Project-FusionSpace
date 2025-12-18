import { Router } from "express";
import {
    createCommunity,
    getMyCommunity,
    getCommunity,
    getCommunityPosts,
    updateCommunity,
    deleteCommunity
} from "../controllers/community.controller.js";
import isCommunityOwner from "../middlewares/isCommunityOwner.js";
import isCommunityMember from "../middlewares/isCommunityMember.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";


const router = Router();

// auth
router.route("/")
    .post(verifyJWT,
        upload.fields([
            {
                name: "avatarFile",
                maxCount: 1
            }
        ]), createCommunity)
    .get(verifyJWT, getMyCommunity);

// auth + Join before details
router.route("/:communityId").get(verifyJWT, getCommunity);

router.route("/:communityId").get(verifyJWT, isCommunityMember, getCommunityPosts);

// auth owner only
router.route("/:communityId").patch(verifyJWT,
        upload.fields([
            {
                name: "avatarFile",
                maxCount: 1
            }
        ]), createCommunity)
    .get(verifyJWT, isCommunityOwner, updateCommunity);

// auth owner only
router.route("/:communityId").delete(verifyJWT, isCommunityOwner, deleteCommunity);

export default router;
