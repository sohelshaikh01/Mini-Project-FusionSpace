import mongoose from 'mongoose';
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import { Post } from "../models/post.models.js";
import { Follow } from "../models/follows.models.js";
import { Community } from '../models/community.models.js';


// auth - following and public posts --
const feed = asyncHandler( async(req, res) => {

  // 1. Get the current user's ID (must be a Mongoose ObjectId)
  const currentUserId = req.user._id; // Assume req.user.id is already a valid ObjectId string
  
  // 2. Pagination parameters
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
    // 3. Find all users the current user is following
    const followedUsers = await Follow.find({ followerId: currentUserId });

    const followedUserIds = followedUsers.map(f => f.followingId);

    const feedPosts = await Post.find({
      owner: { $in: followedUserIds },
      isPublic: true,
    })
    .sort({ created_at: -1 })
    .skip(offset)
    .limit(limit)
    .populate('owner', 'username avatar') 
    .exec();

    return res.status(200).json(feedPosts);

});

// --- Single-Query Aggregation Pipeline Method ---

// async function getFeedAggregated(req, res) {
//   const currentUserId = mongoose.Types.ObjectId(req.user.id);
//   const limit = parseInt(req.query.limit) || 10;
//   const offset = parseInt(req.query.offset) || 0;

//   try {
//     const feedPosts = await Follow.aggregate([
//       // 1. Match: Find all 'Following' records for the current user
//       {
//         $match: {
//           followingId: currentUserId,
//         },
//       },
//       // 2. $lookup: "Join" the 'Post' collection 
//       //    This creates a temporary array of posts for each 'Following' record.
//       {
//         $lookup: {
//           from: 'posts', // The name of the target collection in MongoDB (usually plural)
//           localField: 'followerId', // Field from the 'Following' collection (who they follow)
//           foreignField: 'ownerId',  // Field from the 'Post' collection (the post owner)
//           as: 'postsFromFollowedUser', // Name of the new array field
//         },
//       },
//       // 3. $unwind: Deconstructs the 'postsFromFollowedUser' array, 
//       //    creating a new document for each post.
//       { $unwind: '$postsFromFollowedUser' },
      
//       // 4. $replaceRoot: Elevates the post data to the top level of the document
//       { $replaceRoot: { newRoot: '$postsFromFollowedUser' } },
      
//       // 5. $match: Filter out private posts
//       { $match: { isPublic: true } },

//       // 6. Sort, Skip, and Limit for final presentation and pagination
//       { $sort: { created_at: -1 } },
//       { $skip: offset },
//       { $limit: limit },
      
//       // Optional: Add another lookup to get the owner's details directly on the post object
//       // (This requires another $lookup stage)
//     ]);

//     return res.status(200).json(feedPosts);

//   } catch (error) {
//     console.error('Error fetching aggregated feed:', error);
//     return res.status(500).json({ message: 'Failed to retrieve feed.' });
//   }
// }

// /get - public + post / communities
// Trending heading
// public post of people not followed
// Not of owner, community, followings
const exploreFeed = asyncHandler(async (req, res) => {

    const userId = req.user._id;

    // 1. Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // 2. Find all users the current user is FOLLOWING
    const followingRecords = await Follow.find({
      followerId: userId,
    }).select('followingId');

    const followingIds = followingRecords.map(record => record.followingId);

    // 3. Define the Main Query
    const mainPostQuery = {
      isPublic: true,        
      owner: { $nin: followingIds },
      communityId: null,        
    };

    // 4. --- Fetch Main Posts (Paginated) ---
    const totalExplorePosts = await Post.countDocuments(mainPostQuery);

    const explorePosts = await Post.find(mainPostQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("owner", "username avatar")
      .select("text image owner likeCount _id")
      .lean();

    // 5. --- Fetch Trending Headlines (Simulated)
    const trendingHeadlines = await Post.find(mainPostQuery)
      .sort({ likeCount: -1, createdAt: -1 })
      .limit(5)
      .select("text likeCount _id")
      .lean();

    const formattedHeadlines = trendingHeadlines.map(post => ({
      postId: post._id,
      headline: post.text.substring(0, 50) + '...',
      likeCount: post.likeCount,
    }));

    // 6. Calculate pagination metadata for the main feed
    const totalPages = Math.ceil(totalExplorePosts / limit);
    const hasNextPage = page < totalPages;

    const responseData = {
      trendingHeadlines: formattedHeadlines,
      exploreFeed: explorePosts,
      pagination: {
        totalPosts: totalExplorePosts,
        totalPages,
        currentPage: page,
        hasNextPage,
        limit,
      },
    };

    return res
      .status(200)
      .json(
        new ApiResponse(200, responseData, "Explore feed fetched successfully")
      );
});


// /get - most liked public, most members --
const trending = asyncHandler(async (req, res) => {
   
    const postLimit = 10;
    const communityLimit = 5;

    // 1. --- Fetch Trending Posts (Most Liked Public Posts) ---
    const trendingPosts = await Post.find({ isPublic: true })
        .sort({ likeCount: -1, createdAt: -1 })
        .limit(postLimit)
        .populate("owner", "username avatar")
        .select("text image owner likeCount _id")
        .lean();

    // 2. --- Fetch Trending Communities (Highest Member Count) ---
    const trendingCommunities = await Community.aggregate([
        {
        $project: {
            communityName: 1,
            avatar: 1,
            membersCount: { $size: "$members" },
            ownerId: 1,
            _id: 1,
        },
        },
        {
        $sort: { membersCount: -1 }
        },
        {
        $limit: communityLimit
        },
    ]);

    // 3. Construct the final combined response
    const responseData = {
        trendingPosts: trendingPosts,
        trendingCommunities: trendingCommunities,
    };

    return res
        .status(200)
        .json(
            new ApiResponse(
                200, responseData, "Trending data fetched successfully"
            )
        );
});

export {
    feed,
    exploreFeed,
    trending
}