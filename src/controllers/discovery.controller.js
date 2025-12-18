import mongoose from 'mongoose';
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import { Post } from "../models/post.models.js";
import { Follow } from "../models/follows.models.js";
import { Community } from '../models/community.models.js';

// --done just check out in frontend

// Get = auth following + communities posts
  // Create post on feed page as home page
 
  // make at home page
  // Following posts
  // Communities posts
  // send in seprate
const feed = asyncHandler( async(req, res) => {

  // 1. Get the current user's ID (must be a Mongoose ObjectId)
  const currentUserId = req.user._id; // Assume req.user.id is already a valid ObjectId string
  
  // 2. Pagination parameters
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
    // 3. Find all users the current user is following
    // We only need the 'followerId' field (the users being followed).
    const followedUsers = await Follow.find(
      { followingId: currentUserId }, 
      { followerId: 1, _id: 0 } // Project only the followerId
    ).lean(); 
    
    // Extract the array of followed user ObjectIds
    const followedUserIds = followedUsers.map(f => f.followerId);

    // 4. Fetch the public posts from those followed users
    const feedPosts = await Post.find({
      // Match posts where the ownerId is in the array of followedUserIds
      ownerId: { $in: followedUserIds },
      // And the post is public
      isPublic: true,
    })
    .sort({ created_at: -1 }) // Sort by creation date descending
    .skip(offset)
    .limit(limit)
    // Optional: Populate the owner data to display username/avatar
    .populate('ownerId', 'username avatar') 
    .exec();
    
    // 5. Send the successful response
    return res.status(200).json(feedPosts);

});

// --- Single-Query Aggregation Pipeline Method ---

// async function getFeedAggregated(req, res) {
//   const currentUserId = mongoose.Types.ObjectId(req.user.id);
//   const limit = parseInt(req.query.limit) || 10;
//   const offset = parseInt(req.query.offset) || 0;

//   try {
//     const feedPosts = await Following.aggregate([
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

// Get = public + post / comm
    // Trending heading
    // public post of people not followed
    
const exploreFeed = asyncHandler(async (req, res) => {

    const userId = req.user._id;

    // 1. Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // 2. Find all users the current user is FOLLOWING
    // We need the array of IDs of the people the user is following.
    const followingRecords = await Follow.find({
      followerId: userId,
    }).select('followingId');

    // Create an array of IDs of users to EXCLUDE from the post feed
    const followingIds = followingRecords.map(record => record.followingId);

    // 3. Define the Main Query
    const mainPostQuery = {
      isPublic: true,              // Must be a public post
      owner: { $nin: followingIds }, // Owner must NOT be in the following list
      communityId: null,           // Optionally exclude community posts from the general feed
    };

    // 4. --- Fetch Main Posts (Paginated) ---

    const totalExplorePosts = await Post.countDocuments(mainPostQuery);

    const explorePosts = await Post.find(mainPostQuery)
      .sort({ createdAt: -1 }) // Sort by latest (you could also sort by 'likeCount' here)
      .skip(skip)
      .limit(limit)
      .populate("owner", "username avatar")
      .select("text image owner likeCount _id")
      .lean();

    // 5. --- Fetch Trending Headlines (Simulated) ---
    // To simulate trending, we look for the top 5 most-liked public posts 
    // from users the current user does not follow.
    const trendingHeadlines = await Post.find(mainPostQuery)
      .sort({ likeCount: -1, createdAt: -1 }) // Sort primarily by like count
      .limit(5) // Get top 5 trending
      .select("text likeCount _id")
      .lean();

    // Format headlines for display
    const formattedHeadlines = trendingHeadlines.map(post => ({
      postId: post._id,
      headline: post.text.substring(0, 50) + '...', // Use the start of the text as the headline
      likeCount: post.likeCount,
    }));

    // 6. Calculate pagination metadata for the main feed
    const totalPages = Math.ceil(totalExplorePosts / limit);
    const hasNextPage = page < totalPages;

    // 7. Construct the final combined response
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

    // 8. Success Response
    return res
      .status(200)
      .json(
        new ApiResponse(200, responseData, "Explore feed fetched successfully")
      );
});


// Get = public most liked
// most liked from
// public
// communities
const trending = asyncHandler(async (req, res) => {
    // Define limits for both sections
    const postLimit = 10;
    const communityLimit = 5;

    // 1. --- Fetch Trending Posts (Most Liked Public Posts) ---
    
    // Query for posts that are explicitly public
    const trendingPosts = await Post.find({ isPublic: true })
        .sort({ likeCount: -1, createdAt: -1 }) // Sort by likeCount descending, then latest
        .limit(postLimit)
        .populate("owner", "username avatar") // Show who owns the post
        .select("text image owner likeCount _id")
        .lean();

    // 2. --- Fetch Trending Communities (Highest Member Count) ---
    
    // Note: The Mongoose query needs to sort by the size of the 'members' array.
    // We use the aggregation framework for sorting by array size, which is efficient.
    
    const trendingCommunities = await Community.aggregate([
        {
        $project: {
            communityName: 1,
            avatar: 1,
            membersCount: { $size: "$members" }, // Calculate the size of the members array
            ownerId: 1,
            _id: 1,
        },
        },
        {
        $sort: { membersCount: -1 } // Sort by the calculated count descending
        },
        {
        $limit: communityLimit
        },
        // Optional: Populate the owner details if needed (requires another $lookup stage)
    ]);

    // 3. Construct the final combined response
    const responseData = {
        trendingPosts: trendingPosts,
        trendingCommunities: trendingCommunities,
    };

    // 4. Success Response
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