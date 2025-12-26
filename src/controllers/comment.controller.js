import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import { Comment } from "../models/comment.models.js";
import { Post } from "../models/post.models.js";
import { Like } from "../models/like.models.js";


// /post = auth --
// Like count related to Post, Comment
const createComment = asyncHandler(async(req, res) => {
    
    const { postId } = req.params;
    const { content } = req.body;

    if(!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ApiError(400, "Invalid post ID");
    }

    if(!content || content.trim() == "") {
        throw new ApiError(400, "Comment content cannot be empty");
    }

    const userId = req.user._id;

    const isPost = await Post.findById(postId);

    if(!isPost) {
        throw new ApiError(404, "Post not found");
    }

    isPost.commentCount = isPost.commentCount+1;
    await isPost.save();

    const comment = await Comment.create({
        content,
        ownerId: userId,
        postId
    });

    if(!comment) {
        throw new ApiError("Failed to create comment");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(201, comment, "Comment added successfully")
        );
});

// /get - public --
const getComments = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new ApiError(400, "Invalid post ID");
    }

    const comments = await Comment.find({ postId })
        .populate("ownerId", "username avatar fullName") 
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    if (!comments || comments.length === 0) {
        return res
            .status(404)
            .json(new ApiResponse(404, [], "No comments found for this post"));
    }

    const formattedComments = comments.map(comment => {
        const commentObj = comment.toObject();
        return {
            ...commentObj,
            owner: {
                ownerId: comment.owner?._id,
                username: comment.owner?.username,
                avatar: comment.owner?.avatar
            }
        };
    });

    return res
        .status(200)
        .json(new ApiResponse(200, formattedComments, "Comments fetched successfully"));
});

// /post - auth
// For comment on comments
// const replyComment = () => {}

// /patch - auth owner --
const editComment = asyncHandler(async(req, res) => {

    const { commentId } = req.params;
    const { content } = req.body;

    if(!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Comment content cannot be empty");
    }

    if(!content || content.trim() == "" ) {
        throw new ApiError(400, "Comment content cannot be empty");
    }
    
    const isComment = await Comment.findById(commentId);

    if(!isComment) {
        throw new ApiError(404, "Comment Not Found!");
    }

    if (isComment.ownerId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not Autorized to update this comment");
    }

    isComment.content = content;
    await isComment.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, isComment, "Comment updated Successfully")
        );
})

// /delete - auth owner --
const deleteComment = asyncHandler(async(req, res) => {

    // Delete like related this
    const { commentId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    const userId = req.user._id;
    const isComment = await Comment.findById(commentId);

    if(!isComment) {
        throw new ApiError(404, 'Comment Not Found!');
    }

    if(userId.toString() !== isComment.ownerId.toString()) {
        throw new ApiError(403, "You are not authorized to delete this comment");
    }

    const postId = isComment.postId;
    const isPost = await Post.findById( postId );
    isPost.commentCount = Math.max(0, isPost.commentCount - 1);
    await isPost.save();

    await Like.deleteMany({commentId});

    const deletedComment = await isComment.deleteOne();

    if(deletedComment.deleteCount === 0) {
        throw new ApiError(500, "Failed to delete comment");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export {
    // replyComment,
    createComment,
    getComments,
    editComment,
    deleteComment
}
