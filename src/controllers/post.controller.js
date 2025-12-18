import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Community } from "../models/community.models.js";

import {
    uploadOnCloudinary,
    removeFromCloudinary
} from "../utils/cloudinary.js";
import { Post } from "../models/post.models.js";


// Get = public + auth --new
const getPosts = asyncHandler(async (req, res) => {
    const userId = req.user._id; // Owner ID is the authenticated user

    // 1. Get pagination parameters
    const page = parseInt(req.query.page) || 1; 
    const limit = 10; // Standard default limit
    const skip = (page - 1) * limit;

    // 2. Define the filter query
    // We want ALL posts where the owner field matches the authenticated user ID
    const query = {
        owner: userId, 
    };

    // 3. Execute queries
    
    // A. Get the total count of matching documents for pagination metadata
    const totalPosts = await Post.countDocuments(query);

    // B. Get the paginated and sorted posts
    const posts = await Post.find(query)
        .sort({ createdAt: -1 }) // Sort by latest (descending)
        .skip(skip)              // Apply pagination skip
        .limit(limit)            // Apply pagination limit
        // Populate the owner and community details for display
        .populate("owner", "username avatar") 
        .populate("communityId", "communityName avatar") 
        .lean();

    // 4. Calculate pagination metadata
    const totalPages = Math.ceil(totalPosts / limit);
    const hasNextPage = page < totalPages;

    // 5. Construct the final response data
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

    // 6. Success Response
    return res
        .status(200)
        .json(
        new ApiResponse(200, responseData, "User timeline posts fetched successfully")
        );
});


// --change communityId
// Post = auth
const publishAPost = asyncHandler(async (req, res) => {
  const { text, communityId } = req.body; // Destructure communityId from body
  const userId = req.user._id;

  // 1. Basic Validation
  if (!text || text.trim() === "") {
    throw new ApiError(400, "Post content (text) is required");
  }

  // 2. Determine Post Type and Access Control
  let isPublicStatus = true;
  let targetCommunityId = null;

  if (communityId && mongoose.Types.ObjectId.isValid(communityId)) {
    // A. Community Post Logic
    targetCommunityId = communityId;
    isPublicStatus = false; // Post is private to the community

    // 2a. Check if the community exists and the user is a member
    const community = await Community.findById(targetCommunityId).select("members");

    if (!community) {
      throw new ApiError(404, "Target community not found");
    }

    if (!community.members.includes(userId)) {
      throw new ApiError(403, "You must be a member of this community to post here");
    }
  } 
  // Else: communityId is null/invalid, so targetCommunityId remains null and isPublicStatus remains true.

  // 3. Handle Image Upload
  const imageFilePath = req.files?.imageFile?.[0]?.path || null;
  let imageUrl = null;

  if (imageFilePath) {
    const image = await uploadOnCloudinary(imageFilePath);

    if (!image) {
      // Note: If Cloudinary fails, you might want to consider deleting the local file here.
      throw new ApiError(500, 'Image upload failed. Post not created.');
    }
    imageUrl = image.url;
  }

  // 4. Create the Post
  const postCreated = await Post.create({
    text,
    image: imageUrl,
    owner: userId,
    isPublic: isPublicStatus,      // Dynamic: true (public) or false (community)
    communityId: targetCommunityId // Dynamic: ObjectId or null
  });

  if (!postCreated) {
    throw new ApiError(500, "Post not published due to database error");
  }

  // 5. Success Response
  return res
    .status(201)
    .json(
      new ApiResponse(201, postCreated, "Post published successfully")
    );
});


// Get = publish + auth
const getPostById = asyncHandler( async(req, res) => {

    // Resolve whom to return the post
    const { postId } = req.params;

    if(!postId) {
        throw new ApiError(404, "PostId is required");
    }

    if(!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ApiError(400, "Invalid post ID format")
    }

    const post = await Post.findById(postId).lean();

    if(!post) {
        throw new ApiError(404, "Post Not Found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, post, "Post Details Fetched Successfully")
        );

});

// Patch = auth --
const updateAPost = asyncHandler( async(req, res) => {
    // remain to update isPublic status

    const { postId} = req.params;
    const { text } = req.body;

    if (!postId) {
        throw new ApiError(400, "postId is required");
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ApiError(400, "Invalid postId format");
    }

    if(!text || text.trim() == "") {
        throw new ApiError(400, "All fields are required!")
    }

    const isPost = await Post.findById(postId);

    if(!postId) {
        throw new ApiError(404, "Post Not Found!");
    }

    const userId = req.user._id;

    if(isPost.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You are not authorized to update this post");
    }

    isPost.text = text;

    // Not working if not image or field mentioned
    const imageFilePath = req.files?.imageFile[0]?.path || null;

    if(imageFilePath) {
        const uploadedImage = await uploadOnCloudinary(imageFilePath);

        if(isPost.image) {
            const deletedImage = await removeFromCloudinary(isPost.image);
            if(!deletedImage) {
                console.log("Image not deleted in Updation");
            }
        }
        
        isPost.image = uploadedImage.url || "";
    }

    await isPost.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, isPost, "Post updated successfully")
        );

});

// Delete = auth
const deleteAPost = asyncHandler( async(req, res) => {
    // delete comments and likes from that table.

    const { postId } = req.params;
    const userId = req.user._id;

    if(!postId) {
        throw new ApiError(404, "postId is required");
    }

    if(!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ApiError(400, 'Invalid post Id formant');
    }

    const post = await Post.findById(postId);

    if (post.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You are not allowed to delete this post");
    }

    if(post.image) {
        await removeFromCloudinary(post.image);
    }

    // write comments and like delete here

    await Post.deleteOne({ _id: postId });

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Post deleted successfully")
        );
});

// remain as above not contain publish field.
// Patch = auth
const togglePublishStatus = asyncHandler( async(req, res) => {
    // use $or operator

    const { postId } = req.params;

    if (!postId) {
        throw new ApiError(400, "postId is required");
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ApiError(400, "Invalid postId format");
    }

    const isPost = await Post.findById(postId);

    if(!isPost) {
        throw new ApiError(404, "Post not found");
    }

    isPost.isPublic = !isPost.isPublic;
    await isPost.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, isPost, 'This Post publish status has been toggle')
        )
});

// Get = if post is public
const searchPost = asyncHandler ( async(req, res) => {
    // make route proper - add params

});

export {
    getPosts,
    publishAPost,
    getPostById,
    updateAPost,
    deleteAPost,
    togglePublishStatus,
    searchPost
};



