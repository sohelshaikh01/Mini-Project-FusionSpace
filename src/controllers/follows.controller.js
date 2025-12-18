import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { Follow }from "../models/follows.models.js";
import { User } from "../models/user.models.js";


// -- all done

// Post = auth --done
// extract channelId and userId
// -- $or to check subscription exists or not
// validate channelId
// check subscriberId == req.userId
// is following exists
// if exists then return error following
// else createOne
// response new follow

const followUser = asyncHandler(async (req, res) => {
    // followerId is the currently logged-in user (the source of the action)
    const followerId = req.user._id;

    // followingId is the user ID from the URL params (the target of the action)
    const { userId: followingId } = req.params;

    // 1. Basic Validation: Cannot follow self
    if (followerId.toString() === followingId.toString()) {
        throw new ApiError(400, "You cannot follow yourself");
    }

    // 2. Validation: Check for valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(followingId)) {
        throw new ApiError(400, "Invalid Following ID");
    }

    // 3. Check if the target user exists
    // NOTE: This checks the User model, not the Follow model
    const userToFollow = await User.findById(followingId).select('_id');
    if (!userToFollow) {
        throw new ApiError(404, "User not found");
    }

    // 4. Check if the relationship already exists
    const alreadyFollowing = await Follow.findOne({
        followerId,
        followingId
    });

    if (alreadyFollowing) {
        throw new ApiError(400, "Already following this user");
    }

    // 5. Create the Follow relationship
    await Follow.create({
        followerId,
        followingId
    });

    // 6. Atomically update user counts
    
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

    // 7. Success Response
    return res
        .status(201)
        .json(
        new ApiResponse(201, {}, "User followed successfully")
        );
});

// Delete = auth --done
// extract channelId and userId
// -- $or to check subscription exists or not
// validate channelId
// check subscriberId == req.userId
// is following exists
// !exists return error not following
// else deleteOne
// response unfollowing
const unfollowUser = asyncHandler(async (req, res) => {
    // followerId is the currently logged-in user (the source of the action)
    const followerId = req.user._id;

    // followingId is the user ID from the URL params (the target of the action)
    const { userId: followingId } = req.params;

    // 1. Basic Validation: Cannot unfollow self
    if (followerId.toString() === followingId.toString()) {
        throw new ApiError(400, "You cannot unfollow yourself");
    }

    // 2. Validation: Check for valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(followingId)) {
        throw new ApiError(400, "Invalid Following ID");
    }

    // 3. Find the existing Follow relationship
    const followRecord = await Follow.findOne({
        followerId,
        followingId
    });

    if (!followRecord) {
        throw new ApiError(400, "You are not following this user");
    }

    // 4. Delete the Follow relationship
    await followRecord.deleteOne();

    // 5. Atomically update user counts (Decrement)
    
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

    // 6. Success Response
    return res.status(200).json(
        new ApiResponse(200, {}, "User unfollowed successfully")
    );
});


// Get = Public
// get userId
// validate id
// if not send error
// fetch all where following = userid
// populate username, avatar, userid
// if not return []
// return list
const getFollowers = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // 1. Validation: Check for valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid User ID");
    }

    // 2. Fetch followers
    // Followers are the people who have the target user (userId) as their 'followingId'.
    const followers = await Follow.find({ followingId: userId })
        // Populate the 'followerId' field to get details of the users who are following
        .populate("followerId", "fullname username avatar")
        // Optional: Add a limit, pagination, or sorting here for performance in a real app
        .lean(); // Use .lean() for faster read operations since we are not modifying the documents

    // 3. Extract the User objects from the populated field
    const followerUsers = followers.map(followRecord => followRecord.followerId);

    // 4. Success Response
    return res.status(200).json(
        new ApiResponse(200, followerUsers, "Followers fetched successfully")
    );
});

// Get = Public
// get userId and followerId
// validate followerId
// if not send error
// fetch all where followerid = userid
// populate username, avatar, userid
// if not return []
// formulte channel id to string
// return res
const getFollowing = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // 1. Validation: Check for valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid User ID");
  }

  // 2. Fetch following list
  // The 'following' list consists of users who are the 'followingId' in a relationship
  // where the target user (userId) is the 'followerId'.
  const following = await Follow.find({ followerId: userId })
    // Populate the 'followingId' field to get details of the users being followed
    .populate("followingId", "fullname username avatar")
    .lean(); // Use .lean() for performance

  // 3. Extract the User objects from the populated field
  const followingUsers = following.map(followRecord => followRecord.followingId);

  // 4. Success Response
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