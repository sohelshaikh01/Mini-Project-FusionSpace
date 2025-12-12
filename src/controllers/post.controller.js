import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

import {
    uploadOnCloudinary,
    removeFromCloudinary
} from "../utils/cloudinary.js";
import { Post } from "../models/post.models.js";


// Get = public + auth --
const getPosts = asyncHandler( async(req, res) => {

    // auth - middleware
    // req.user
    // find user or not
    // find all posts by user id - aggregate or paginate
    // !post return error
    // post return


});

// Post = auth
const publishAPost = asyncHandler( async(req, res) => {
    // post content
    // ispublic, communityId

    const { text } = req.body;

    if(!text || text.trim() == "") {
        throw new ApiError(400, "All fields are required")
    }

    const imageFilePath = req.files?.imageFile?.[0]?.path || null;

    let image;

    if(!imageFilePath) {
        image = null;
    }
    else {
        image = await uploadOnCloudinary(imageFilePath);

        if(!image) {
            throw new ApiError(400, 'Image is required');
        }
    }

    const userId = req.user._id;

    const postCreated = await Post.create({
        text, 
        image: image?.url || null,
        owner: userId,
        ispublic: null,
        communityId: null
    });

    if(!postCreated) {
        throw new ApiError(400, "Post not published");
    }

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



