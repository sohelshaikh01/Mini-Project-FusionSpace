import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

import {
    uploadOnCloudinary,
    removeFromCloudinary
} from "../utils/cloudinary.js";
import { Community } from "../models/community.models.js";
import { Post } from "../models/post.models.js";
import { Like } from "../models/like.models.js";


// /get - all of user --
const getPosts = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    if(!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid User ID")
    }

    // 1. Get pagination parameters
    const page = parseInt(req.query.page) || 1; 
    const limit = 10;
    const skip = (page - 1) * limit;

    // 2. Define the filter query
    const query = {
        owner: userId, 
    };

    // 3. Execute queries
    
    const totalPosts = await Post.countDocuments(query);

    // B. Get the paginated and sorted posts
    const posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)         
        .limit(limit)  
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

    return res
        .status(200)
        .json(
        new ApiResponse(200, responseData, "User timeline posts fetched successfully")
        );
});

// /post - auth: Change CommunityId
const publishAPost = asyncHandler(async (req, res) => {
  const { text, communityId } = req.body;
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

  // 3. Handle Image Upload
  const imageFilePath = req.files?.imageFile?.[0]?.path || null;
  let imageUrl = null;

  if (imageFilePath) {
    const image = await uploadOnCloudinary(imageFilePath);

    if (!image) {
      throw new ApiError(500, 'Image upload failed. Post not created.');
    }
    imageUrl = image.url;
  }

  // 4. Create the Post
  const postCreated = await Post.create({
    text,
    image: imageUrl,
    owner: userId,
    isPublic: isPublicStatus,
    communityId: targetCommunityId
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

// /get public + auth --
const getPostById = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const postData = await Post.findById(postId)
        .populate("owner", "username avatar")
        .populate("communityId", "communityName avatar description")
        .lean();

    if (!postData) throw new ApiError(404, "Post Not Found");

    // -- Handle Guest vs Logged In User --
    const userId = req.user?._id; 
    let isLiked = false;

    // Only check DB if there is a logged-in user
    if (userId) {
        const existingLike = await Like.findOne({
            post: postId,
            likedBy: userId
        });
        isLiked = !!existingLike;
    }

    const { communityId, ...restOfPost } = postData;

    const formattedPost = {
        ...restOfPost,
        isLiked, 
        communityDetails: communityId,
        owner: {
            owner: postData.owner?.username,
            _id: postData.owner?._id,
            avatar: postData.owner?.avatar
        }
    };

    return res.status(200).json(new ApiResponse(200, formattedPost));
});

// /path auth --
// remain isPublic update or togglePublishStatus()
const updateAPost = asyncHandler( async(req, res) => {

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

// /delete - auth --
// delete post related in other tables
const deleteAPost = asyncHandler( async(req, res) => {

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

    await Post.deleteOne({ _id: postId });

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Post deleted successfully")
        );
});

// /patch - auth
// can use $or
const togglePublishStatus = asyncHandler( async(req, res) => {

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

export {
    getPosts,
    publishAPost,
    getPostById,
    updateAPost,
    deleteAPost,
    togglePublishStatus,
};



