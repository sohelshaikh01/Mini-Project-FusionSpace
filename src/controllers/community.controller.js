import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

import { Community } from "../models/community.models.js";
import { uploadOnCloudinary, removeFromCloudinary } from "../utils/cloudinary.js";

// --done

// What is this for ...
// const getPost = asyncHandler(async (req, res) => {
//     const { postId } = req.params;

//     const post = await Post.findById(postId);
//     if (!post) throw new ApiError(404, "Post not found");

//     // Public post → allow directly
//     if (post.isPublic) {
//         return res.status(200).json(new ApiResponse(200, post));
//     }

//     // Private post → must check community
//     const community = await Community.findById(post.communityId);

//     if (!community.members.includes(req.user._id)) {
//         throw new ApiError(403, "Not allowed to view this post");
//     }

//     return res.status(200).json(new ApiResponse(200, post));
// });


// Post = auth
    // community name, avatar, ownerId(userId), members = 0
    // validate data
    // upload image if available
    // save data
    // create in mongodb
    // !created return error
    // return created

    // also add owner in community as member
const createCommunity = asyncHandler(async (req, res) => {
  const { communityName } = req.body;
  const ownerId = req.user._id;

  // 1. Validation (Presence Check)
  if (!communityName || communityName.trim() === "") {
    throw new ApiError(400, "Community name is required");
  }

  // 2. Uniqueness Check: Find if a community with this name already exists
  const existingCommunity = await Community.findOne({
    // Use case-insensitive search if needed, but simple exact match is faster
    communityName: communityName
  });

  if (existingCommunity) {
    throw new ApiError(409, "A community with this name already exists");
  }

  // 3. Handle Avatar File Upload
  // NOTE: The request provided 'avatarFile' in the snippet, so using that here.
  const avatarLocalPath = req.files?.avatarFile?.[0]?.path || null;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    // Note: A real app should delete the local file here if upload fails
    throw new ApiError(400, "Avatar upload failed. Please try again.");
  }

  // 4. Create the Community
  const community = await Community.create({
    communityName,
    avatar: avatar.url,
    ownerId,
    // Initialize members array with the owner
    members: [ownerId],
  });

  if (!community) {
    // Note: If creation fails, consider deleting the uploaded avatar from Cloudinary
    throw new ApiError(500, "Failed to create community");
  }

  // 5. Success Response
  return res
    .status(201)
    .json(
      new ApiResponse(201, community, "Community created successfully")
    );
});

// Get = auth
    // get userid
    // check userid = communities
    // !communities return error
    // return communities
const getMyCommunity = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Find all communities where the user ID is in the 'members' array
    const myCommunities = await Community.find({
        members: userId
    }).select("-ownerId"); // Exclude ownerId for brevity in the list view

    if (!myCommunities || myCommunities.length === 0) {
        return res
        .status(200)
        .json(
            new ApiResponse(200, [], "You are not a member of any community")
        );
    }

    // Success Response
    return res
        .status(200)
        .json(
        new ApiResponse(200, myCommunities, "My communities fetched successfully")
        );
});
    

// ---------------- If user if member then only show posts
// Get = auth Before joining details
    // get community id
    // validate id
    // get community details
    // !community return error
    // return errorconst 
const getCommunity = asyncHandler(async (req, res) => {
    const { communityId } = req.params;

    // 1. Validation
    if (!mongoose.Types.ObjectId.isValid(communityId)) {
        throw new ApiError(400, "Invalid Community ID");
    }

    // 2. Fetch Community details, populating owner and members
    const community = await Community.findById(communityId)
        .populate("ownerId", "username fullname avatar")
        .populate("members", "username fullname avatar");

    if (!community) {
        throw new ApiError(404, "Community not found");
    }

    // Success Response
    return res
        .status(200)
        .json(
        new ApiResponse(200, community, "Community details fetched successfully")
        );
});


// new --
const getCommunityPosts = asyncHandler(async (req, res) => {
  const { communityId } = req.params;

  // 1. Validation (Though middleware checks validity, it's good practice)
  if (!communityId || !mongoose.Types.ObjectId.isValid(communityId)) {
    // This should ideally be caught by isCommunityMember, but remains a safeguard
    throw new ApiError(400, "Invalid Community ID");
  }

  // 2. Get pagination parameters
  const page = parseInt(req.query.page) || 1; 
  const limit = 10; // Standard limit for a feed
  const skip = (page - 1) * limit;

  // 3. Define the filter query
  // Posts must belong to the specific communityId
  const query = {
    communityId: communityId, 
    // Note: No 'isPublic: false' filter is needed here. 
    // Since the user is a member, they can see all posts tied to this communityId.
  };

  // 4. Execute queries
  
  // A. Get the total count of matching documents for pagination metadata
  const totalPosts = await Post.countDocuments(query);

  // B. Get the paginated and sorted posts
  const posts = await Post.find(query)
    .sort({ createdAt: -1 }) // Sort by latest (descending)
    .skip(skip)              // Apply pagination skip
    .limit(limit)            // Apply pagination limit
    // Populate the owner and community details
    .populate("owner", "username avatar") 
    .populate("communityId", "communityName avatar") 
    .lean();

  // 5. Calculate pagination metadata
  const totalPages = Math.ceil(totalPosts / limit);
  const hasNextPage = page < totalPages;

  // 6. Construct the final response data
  const responseData = {
    posts,
    pagination: {
      totalPosts,
      totalPages,
      currentPage: page,
      hasNextPage,
      limit,
    },
  };

  // 7. Success Response
  return res
    .status(200)
    .json(
      new ApiResponse(200, responseData, "Community posts fetched successfully")
    );
});


// Patch = auth owner only
    // get c-id, content
    // validate id
    // get user
    // userid = ownerid
    // !match return error
    // update details
    // delete image of community
    // !update return error
    // return error
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


// Also delete related to join community
// Delete = auth owner only
    // get c-id
    // get user, validate c-id
    // userid = ownerid
    // !match return error
    // delete image of comm
    // delete comm
    // !delete return error
    // return deleted
const deleteCommunity = asyncHandler(async (req, res) => {
    const { communityId } = req.params;

    // 1. Validation
    if (!mongoose.Types.ObjectId.isValid(communityId)) {
        throw new ApiError(400, "Invalid Community ID");
    }

    // 2. Find the community to get the avatar URL for cleanup
    const communityToDelete = await Community.findById(communityId);

    if (!communityToDelete) {
        // This case shouldn't be reached if isCommunityOwner middleware runs first, but safe check
        throw new ApiError(404, "Community not found");
    }

    // 3. Delete the community document
    const result = await Community.deleteOne({ _id: communityId });

    if (result.deletedCount === 0) {
        throw new ApiError(500, "Failed to delete community");
    }

    // 4. Delete the associated avatar from Cloudinary
    if (communityToDelete.avatar) {
        await removeFromCloudinary(communityToDelete.avatar);
    }

    // Note: A complete deletion should also handle associated posts, comments, etc.

    // 5. Success Response
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

