import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { Community } from "../models/community.models.js";

// /post - auth --
const joinCommunity = asyncHandler(async (req, res) => {
    const { communityId } = req.params;
    const userId = req.user._id;

    // 1. Validation: Community ID
    if (!communityId || !mongoose.Types.ObjectId.isValid(communityId)) {
        throw new ApiError(400, "Invalid Community ID");
    }

    // 2. Find the community and check owner status/existing membership
    const community = await Community.findById(communityId);

    if (!community) {
        throw new ApiError(404, "Community not found");
    }

    // Check 2a: Owner cannot join (they are added at creation)
    if (community.ownerId.equals(userId)) {
        throw new ApiError(400, "Community owner is already a member");
    }

    // Check 2b: Already a member
    if (community.members.includes(userId)) {
        throw new ApiError(400, "You are already a member of this community");
    }

    const updatedCommunity = await Community.findByIdAndUpdate(
        communityId,
        { $addToSet: { members: userId } }, // $addToSet ensures no duplicates
        { new: true }
    ).select("communityName members");

    return res
        .status(200)
        .json(
        new ApiResponse(200, updatedCommunity, "Successfully joined community")
        );
});


// /delete - auth --
const leaveCommunity = asyncHandler(async (req, res) => {
    const { communityId } = req.params;
    const userId = req.user._id;

    // 1. Validation: Community ID
    if (!communityId || !mongoose.Types.ObjectId.isValid(communityId)) {
        throw new ApiError(400, "Invalid Community ID");
    }

    // 2. Find the community and check owner status/existing membership
    const community = await Community.findById(communityId);

    if (!community) {
        throw new ApiError(404, "Community not found");
    }

    // Check 2a: Owner cannot leave
    if (community.ownerId.equals(userId)) {
        throw new ApiError(400, "Community owner cannot leave their own community");
    }

    // Check 2b: Not a member
    if (!community.members.includes(userId)) {
        throw new ApiError(400, "You are not a member of this community");
    }

    // 3. Remove user from the members array atomically
    const updatedCommunity = await Community.findByIdAndUpdate(
        communityId,
        { $pull: { members: userId } },
        { new: true }
    ).select("communityName members");

    return res
        .status(200)
        .json(
        new ApiResponse(200, updatedCommunity, "Successfully left community")
        );
});


// /get - auth members --
const getCommunityMembers = asyncHandler(async (req, res) => {
    const { communityId } = req.params;

    // 1. Fetch community document and populate the members field
    const community = await Community.findById(communityId)
        .select("members")
        .populate("members", "username fullname avatar")
        .lean();

    if (!community) {
        throw new ApiError(404, "Community not found");
    }

    // 2. Extract the clean array of member user objects
    const memberList = community.members;

    return res
        .status(200)
        .json(
        new ApiResponse(200, memberList, "Community members fetched successfully")
        );
});


export {
    joinCommunity,
    leaveCommunity,
    getCommunityMembers
}
