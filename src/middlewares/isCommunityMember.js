import { Community } from "../models/community.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";


const isCommunityMember = asyncHandler(async (req, res, next) => {
  const { communityId } = req.params;
  const userId = req.user._id;

  // 1. Validation: Community ID
  if (!communityId || !mongoose.Types.ObjectId.isValid(communityId)) {
    throw new ApiError(400, "Invalid or missing Community ID");
  }

  // 2. Check for membership
  const community = await Community.findById(communityId).select("members");

  if (!community) {
    throw new ApiError(404, "Community not found");
  }

  if (!community.members.includes(userId)) {
    throw new ApiError(403, "Access denied: You must be a member to view this content");
  }

  next();
});

export default isCommunityMember;