import { Router } from "express";
import {
    createCommunity,
    getMyCommunity,
    getCommunity,
    updateCommunity,
    deleteCommunity
} from "../controllers/community.controller.js"

const router = Router();

// auth
router.route("/").post(createCommunity);
// auth
router.route("/").get(getMyCommunity);
// auth + Join before details
router.route("/:communityId").get(getCommunity);
// auth owner only
router.route("/:communityId").patch(updateCommunity);
// auth owner only
router.route("/:communityId").delete(deleteCommunity);


export default router;
