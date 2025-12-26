import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

import { Community } from "../models/community.models.js";
import { Post } from "../models/post.models.js";
import { uploadOnCloudinary, removeFromCloudinary } from "../utils/cloudinary.js";


// /post - auth --
// delete profile photo if unable to create community
const createCommunity = asyncHandler(async (req, res) => {
  const { communityName } = req.body;
  const ownerId = req.user._id;

  // 1. Validation (Presence Check)
  if (!communityName || communityName.trim() === "") {
    throw new ApiError(400, "Community name is required");
  }

  // 2. Uniqueness Check: Find if a community with this name already exists
  const existingCommunity = await Community.findOne({
    communityName: communityName
  });

  if (existingCommunity) {
    throw new ApiError(409, "A community with this name already exists");
  }

  // 3. Handle Avatar File Upload
  const avatarLocalPath = req.files?.avatarFile?.[0]?.path || null;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar upload failed. Please try again.");
  }

  // 4. Create the Community
  const community = await Community.create({
    communityName,
    avatar: avatar.url,
    ownerId,
    members: [ownerId],
  });

  if (!community) {
    throw new ApiError(500, "Failed to create community");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(201, community, "Community created successfully")
    );
});

// /get - auth --
const getMyCommunity = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const myCommunities = await Community.find({
        members: userId
    }).select("-ownerId");

    if (!myCommunities || myCommunities.length === 0) {
        return res
        .status(200)
        .json(
            new ApiResponse(200, [], "You are not a member of any community")
        );
    }

    return res
        .status(200)
        .json(
        new ApiResponse(200, myCommunities, "My communities fetched successfully")
        );
});
    
// /get - auth --
// for review
const getCommunity = asyncHandler(async (req, res) => {
    const { communityId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(communityId)) {
        throw new ApiError(400, "Invalid Community ID");
    }

    const community = await Community.findById(communityId)
        .populate("ownerId", "username fullname avatar")
        .populate("members", "username fullname avatar");

    if (!community) {
        throw new ApiError(404, "Community not found");
    }

    const userId = req.user?._id;
    
    const isMember = community.ownerId?._id.toString() === userId?.toString() || 
                     community.members.some(member => member._id.toString() === userId?.toString());

    const membersCount = community.members.length;

    const communityData = {
        ...community.toObject(),
        isMember,
        membersCount
    };

    return res
        .status(200)
        .json(
            new ApiResponse(200, communityData, "Community details fetched successfully")
        );
});

// for review --
const getCommunityPosts = asyncHandler(async (req, res) => {
  const { communityId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(communityId)) {
    throw new ApiError(400, "Invalid Community ID");
  }

  const page = parseInt(req.query.page) || 1; 
  const limit = 10;
  const skip = (page - 1) * limit;

  const query = { communityId };

  const totalPosts = await Post.countDocuments(query);

  const posts = await Post.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("owner", "username avatar") 
    .populate("communityId", "communityName avatar") 
    .lean();

  // Format posts to match the owner: { owner, _id, avatar } structure
  const formattedPosts = posts.map(post => ({
    ...post,
    owner: {
      owner: post.owner?.username,
      _id: post.owner?._id,
      avatar: post.owner?.avatar
    }
  }));

  const totalPages = Math.ceil(totalPosts / limit);

  return res
    .status(200)
    .json(new ApiResponse(200, {
      posts: formattedPosts,
      pagination: {
        totalPosts,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
    }, "Community posts fetched successfully"));
});

// /path - auth owner --
// not used in fronted
const updateCommunity = asyncHandler(async (req, res) => {
    const { communityId } = req.params;
    const { communityName } = req.body;

    // 1. Validation (ID validation is implicitly required)
    if (!mongoose.Types.ObjectId.isValid(communityId)) {
        throw new ApiError(400, "Invalid Community ID");
    }

    // 2. Prepare update fields
    const updateFields = {};
    if (communityName && communityName.trim() !== "") {
        updateFields.communityName = communityName;
    }

    // 3. Handle new Avatar upload
    const avatarLocalPath = req.files?.avatarFile?.[0]?.path;
    let oldAvatarUrl = null;

    if (avatarLocalPath) {
        // Fetch the current community to get the old avatar URL before updating
        const oldCommunity = await Community.findById(communityId).select("avatar");
        if (oldCommunity) {
            oldAvatarUrl = oldCommunity.avatar;
        }

        const newAvatar = await uploadOnCloudinary(avatarLocalPath);

        if (!newAvatar) {
        throw new ApiError(500, "New avatar upload failed.");
        }

        updateFields.avatar = newAvatar.url;
    }

    if (Object.keys(updateFields).length === 0) {
        throw new ApiError(400, "No fields provided for update (name or avatar)");
    }

    // 4. Update the Community document
    const updatedCommunity = await Community.findByIdAndUpdate(
        communityId,
        { $set: updateFields },
        { new: true } // Returns the updated document
    );

    // 5. Delete old avatar if a new one was uploaded
    if (oldAvatarUrl && updateFields.avatar) {
        // Extract public ID from URL and delete from Cloudinary
        await removeFromCloudinary(oldAvatarUrl);
    }

    // 6. Success Response
    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedCommunity, "Community updated successfully")
        );
});

// /delete - auth owner --
// delete related join community
const deleteCommunity = asyncHandler(async (req, res) => {

    const { communityId } = req.params;

    // 1. Validation
    if (!mongoose.Types.ObjectId.isValid(communityId)) {
        throw new ApiError(400, "Invalid Community ID");
    }

    // 2. Find the community to get the avatar URL for cleanup
    const communityToDelete = await Community.findById(communityId);

    if (!communityToDelete) {
        throw new ApiError(404, "Community not found");
    }

    // 3. Delete the community document
    const result = await Community.deleteOne({ _id: communityId });

    if (result.deletedCount === 0) {
        throw new ApiError(500, "Failed to delete community");
    }

    if (communityToDelete.avatar) {
        await removeFromCloudinary(communityToDelete.avatar);
    }

    return res
        .status(200)
        .json(
        new ApiResponse(200, null, "Community deleted successfully")
        );
});

export {
    createCommunity,
    getMyCommunity,
    getCommunity,
    getCommunityPosts,
    updateCommunity,
    deleteCommunity
}

