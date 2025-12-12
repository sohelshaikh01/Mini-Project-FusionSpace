import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { Community } from "../models/community.models.js";

// Post = auth
    // get c-id
    // get userId
    // validate
    // check community
    // then add user to members
    // !done return error
    // return done
// Assume imports as before

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

    // 3. Add user to the members array atomically
    const updatedCommunity = await Community.findByIdAndUpdate(
        communityId,
        { $addToSet: { members: userId } }, // $addToSet ensures no duplicates
        { new: true }
    ).select("communityName members");

    // 4. Success Response
    return res
        .status(200)
        .json(
        new ApiResponse(200, updatedCommunity, "Successfully joined community")
        );
});


// Delete = auth
    // get c-id
    // get userId
    // validate
    // check if user present
    // !present return error
    // delete user
    // !left return error
    // return left
// Assume imports as before

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

    // 4. Success Response
    return res
        .status(200)
        .json(
        new ApiResponse(200, updatedCommunity, "Successfully left community")
        );
});


// Get = auth only for users
    // get c-id
    // validate c-id
    // get userId
    // userId in members list
    // !list return none
    // get members list
    // !members return error
    // return members
// Assume imports as before

const getCommunityMembers = asyncHandler(async (req, res) => {
    const { communityId } = req.params;

    // We rely on 'isCommunityMember' middleware for existence/access check.
    
    // 1. Fetch community document and populate the members field
    const community = await Community.findById(communityId)
        .select("members")
        .populate("members", "username fullname avatar")
        .lean();

    if (!community) {
        // Safety check, though middleware should catch this
        throw new ApiError(404, "Community not found");
    }

    // 2. Extract the clean array of member user objects
    const memberList = community.members;

    // 3. Success Response
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
