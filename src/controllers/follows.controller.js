import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { Follow }from "../models/follows.models.js";
import { User } from "../models/user.models.js";

// /post auth --
// can use $or to toggle
const followUser = asyncHandler(async (req, res) => {
    const followerId = req.user._id;

    // followingId is the user ID from the URL params (the target of the action)
    const { userId: followingId } = req.params;

    if (followerId.toString() === followingId.toString()) {
        throw new ApiError(400, "You cannot follow yourself");
    }

    if (!mongoose.Types.ObjectId.isValid(followingId)) {
        throw new ApiError(400, "Invalid Following ID");
    }

    // Check if the target user exists in User
    const userToFollow = await User.findById(followingId).select('_id');
    if (!userToFollow) {
        throw new ApiError(404, "User not found");
    }

    // Check if the relationship already exists
    const alreadyFollowing = await Follow.findOne({
        followerId,
        followingId
    });

    if (alreadyFollowing) {
        throw new ApiError(400, "Already following this user");
    }

    // Create the Follow relationship
    await Follow.create({
        followerId,
        followingId
    });

    // Increment the target user's (followingId) followersCount
    await User.findByIdAndUpdate(
        followingId,
        { $inc: { followersCount: 1 } }
    );

    // Increment the source user's (followerId) followingCount
    await User.findByIdAndUpdate(
        followerId,
        { $inc: { followingCount: 1 } }
    );

    return res
        .status(201)
        .json(
        new ApiResponse(201, {}, "User followed successfully")
        );
});

// /delete auth --
// can use $or to toggle
const unfollowUser = asyncHandler(async (req, res) => {
    const followerId = req.user._id;

    const { userId: followingId } = req.params;

    if (followerId.toString() === followingId.toString()) {
        throw new ApiError(400, "You cannot unfollow yourself");
    }

    if (!mongoose.Types.ObjectId.isValid(followingId)) {
        throw new ApiError(400, "Invalid Following ID");
    }

    // Find the existing Follow relationship
    const followRecord = await Follow.findOne({
        followerId,
        followingId
    });

    if (!followRecord) {
        throw new ApiError(400, "You are not following this user");
    }

    // Delete the Follow relationship
    await followRecord.deleteOne();

    // Atomically update user counts (Decrement)
    // Decrement the target user's (followingId) followersCount
    await User.findByIdAndUpdate(
        followingId,
        { $inc: { followersCount: -1 } }
    );

    // Decrement the source user's (followerId) followingCount
    await User.findByIdAndUpdate(
        followerId,
        { $inc: { followingCount: -1 } }
    );

    return res.status(200).json(
        new ApiResponse(200, {}, "User unfollowed successfully")
    );
});


// /get public --
const getFollowers = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid User ID");
    }

    const followers = await Follow.find({ followingId: userId })
        .populate("followerId", "fullname username avatar")
        .lean(); // Use .lean() for faster read operations since we are not modifying the documents

    const followerUsers = followers.map(followRecord => followRecord.followerId);

    return res.status(200).json(
        new ApiResponse(200, followerUsers, "Followers fetched successfully")
    );
});

// /get public --
const getFollowing = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid User ID");
  }

  const following = await Follow.find({ followerId: userId })
    .populate("followingId", "fullname username avatar")
    .lean(); // Use .lean() for performance

  const followingUsers = following.map(followRecord => followRecord.followingId);

  return res.status(200).json(
    new ApiResponse(200, followingUsers, "Following list fetched successfully")
  );

});

export {
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing
}