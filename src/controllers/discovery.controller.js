
// Get = auth following + communities posts
const feed = async(req, res) => {
  // Create post on feed page as home page
 
  // make at home page
  // Following posts
  // Communities posts
  // send in seprate
}

const mongoose = require('mongoose');
const Post = mongoose.model('Post'); // Assuming your models are imported like this
const Following = mongoose.model('Following');

// --- The Feed Controller Function ---

async function getFeed(req, res) {
  // 1. Get the current user's ID (must be a Mongoose ObjectId)
  const currentUserId = req.user.id; // Assume req.user.id is already a valid ObjectId string
  
  // 2. Pagination parameters
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;

  try {
    // 3. Find all users the current user is following
    // We only need the 'followerId' field (the users being followed).
    const followedUsers = await Following.find(
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

  } catch (error) {
    console.error('Error fetching feed:', error);
    return res.status(500).json({ message: 'Failed to retrieve feed.' });
  }
}


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
const explore = async(req, res) => {
    // Trending heading
    
    // public post of people not followed
}

// Get = public most liked
const trending = async(req, res) => {
    // most liked from
    // public
    // communities

}

// For Communities Post

export {
    feed,
    explore,
    trending
}