import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import { Like } from "../models/like.models.js";
import { Post } from "../models/post.models.js";
import { Comment } from "../models/comment.models.js";

// /post auth --
const togglePostLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const likeBy = req.user._id;

  // 1. Validation
  if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, 'Invalid Post ID.');
  }

  // 2. Check for existing like on the Post
  const existingLike = await Like.findOne({
    postId: postId,
    likeBy: likeBy
  });

  let action;

  if (existingLike) {
    // 3a. Like Present: DELETE like and DECREMENT Post likeCount
    await Like.deleteOne({ _id: existingLike._id });
    action = 'unliked';
  } else {
    // 3b. Like Not Present: CREATE like and INCREMENT Post likeCount
    const newLike = new Like({
      postId: postId,
      likeBy: likeBy,
    });
    await newLike.save();
    action = 'liked';
  }

  // 4. Manual Post Count Update
  const isPost = await Post.findById(postId);

  if (!isPost) {
    throw new ApiError(404, 'Post not found');
  }

  if (action === 'liked') {
    isPost.likeCount = isPost.likeCount + 1;
  } else {
    isPost.likeCount = isPost.likeCount - 1;
  }

  await isPost.save();

  // 5. Success Response
  return res
        .status(200)
        .json(
            new ApiResponse(200, {currentLikeCount: isPost.likeCount}, `Post ${action} successfully`)
        );
});

// /post auth --
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const likeBy = req.user._id;

  // 1. Validation
  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, 'Invalid Comment ID.');
  }

  // 2. Check for existing like on the Comment
  const existingLike = await Like.findOne({
    commentId: commentId,
    likeBy: likeBy
  });

  let action;

  if (existingLike) {
    // 3a. Like Present: DELETE like and DECREMENT Comment likeCount
    await Like.deleteOne({ _id: existingLike._id });
    action = 'unliked';
  } else {
    // 3b. Like Not Present: CREATE like and INCREMENT Comment likeCount
    const newLike = new Like({
      commentId: commentId,
      likeBy: likeBy,
    });
    await newLike.save();
    action = 'liked';
  }

  // 4. Manual Comment Count Update
  const isComment = await Comment.findById(commentId);

  if (!isComment) {
    throw new ApiError(404, 'Comment not found');
  }

  if (action === 'liked') {
    isComment.likeCount = isComment.likeCount + 1;
  } else {
    isComment.likeCount = isComment.likeCount - 1;
  }

  await isComment.save();

  // 5. Success Response
  return res
        .status(200)
        .json(
            new ApiResponse(200,{ currentLikeCount: isComment.likeCount}, `Comment ${action} successfully` )
        );
});

export {
    togglePostLike,
    toggleCommentLike,
}
