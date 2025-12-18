import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler }  from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
    uploadOnCloudinary,
    removeFromCloudinary
} from "../utils/cloudinary.js";

import { User } from "../models/user.models.js";
import { Post } from "../models/post.models.js";

const generateRefreshToken = async function(userId) {
    
    try {
        const user = await User.findById(userId);
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return refreshToken;
    }
    catch(error) {
        throw new ApiError(500, "Something went wrong while generating refresh token");
    }
}


// done
const registerUser = asyncHandler ( async(req, res) => {

  
    const { fullName, email, username, password, bio } = req.body;

    if([fullName, email, username, password, bio].some((field) => field?.trim() === "" )) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({ 
        $or: [{ username: username.toLowerCase() }, {email}]
    });

    if(existedUser) {
        throw new ApiError(400, "User with email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path || null

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar) {
        throw new ApiError(400, "Avatar is required");
    }
    
    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        bio
    });

    const createdUser = await User.findById( user._id ).select(
        "-password -refreshToken"
    ).lean();

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registration process");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(201, createdUser, "User registered Successfully")
        );
});


// done
const loginUser = asyncHandler (async(req, res) => {

    // get data
    const { email, username, password } = req.body;
    // validate data
    if(!(username || email)) {
        throw new ApiError(400, "username or email is required");
    }
    // get user
    const user = await User.findOne({
        $or: [{username: username.toLowerCase() }, {email}]
    });
    // if not user return error
    if(!user) {
        throw new ApiError(404, "User does not exits");
    }
    // if user
    // check password
    const isPasswordValid = await user.isPasswordCorrect(password);
    // if not password return error
    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }
    // if password
   const refreshToken = await generateRefreshToken(user._id);

    // get user
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }


    // response data
    return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse( 200, {
            user: loggedInUser,
            refreshToken
        },
        "User Logged in Successfully"
        )
    )

});


//  done
const logoutUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // 1. Remove the refreshToken from the database
    // 🛑 CORRECTED: Added 'await' to ensure the database operation completes
    await User.findByIdAndUpdate(
        userId,
        {
            $unset: {
                refreshToken: 1
            }
        },
        // We don't need 'new: true' here since we don't care about the returned document
        {
            new: true // Good practice, even if not strictly needed here
        }
    );

    // 2. Clear the cookie on the client side
    const options = {
        httpOnly: true,
        // Set 'secure' only in production to work over HTTPS
        secure: process.env.NODE_ENV === "production"
    }

    // 3. Send response and clear the cookie
    return res.status(200)
        .clearCookie("accessToken", options) // Also clear accessToken if you set one
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User logged out successfully")
        );
});

// done
const getCurrentUserProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // 1. Fetch the user's full, current profile from the database
    const userProfile = await User.findById(userId).select(
        // Selectively exclude sensitive fields like password and tokens
        "-password -refreshToken"
    );

    if (!userProfile) {
        // This should theoretically not happen if auth middleware runs, but is a safety net
        throw new ApiError(404, "User not found");
    }

    // 2. Success Response
    return res
        .status(200)
        .json(
            new ApiResponse(200, userProfile, "Current user details fetched successfully")
        );

    /*
    // OPTIONAL: If you truly want to use Mongoose aggregation for complex lookups (like total posts, comments, etc.):
    const aggregatedProfile = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(userId)
            }
        },
        // Add $lookup stages here to fetch counts or related data if needed
        {
            $project: {
                password: 0,
                refreshToken: 0,
                // ... other fields to expose
            }
        }
    ]);

    if (aggregatedProfile.length === 0) {
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, aggregatedProfile[0], "Current user details fetched successfully")
        );
    */
});


 // get username --done
    // valid username
    // aggregate followers, following, userdetails
    // No details then error
    // return res
const getUserProfile = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const loggedInUserId = req.user?._id; // Authenticated user ID (may be null if protect middleware is skipped)

    // 1. Validation: Check for valid target User ID
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid User ID");
    }

    // 2. Fetch the target User Profile
    const user = await User.findById(userId).select(
        "-password -refreshToken" // Exclude sensitive fields
    );

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // 3. Determine Following Status (only if a user is logged in)
    let isFollowing = false;

    if (loggedInUserId) {
        // Check if the authenticated user is following the target user
        const followRecord = await Follow.findOne({
        followerId: loggedInUserId, // The person performing the request
        followingId: userId,        // The person whose profile is being viewed
        });

        if (followRecord) {
        isFollowing = true;
        }
    }

    // 4. Construct the final profile data
    const profileData = {
        user,
        isFollowing,
        // Note: User model should contain followersCount and followingCount 
        // which are automatically returned with the 'user' object.
    };

    // 5. Success Response
    return res
        .status(200)
        .json(
        new ApiResponse(200, profileData, "User profile fetched successfully")
        );
});

// get fullname, email --done
    // check validation
    // find By Id and Update
    // return res - password
const updateMyProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id; // ID of the currently authenticated user
    const { fullName, email } = req.body;

    // 1. Validation: Ensure at least one field is provided for update
    if (!fullName && !email) {
        throw new ApiError(400, "Please provide full name or email to update");
    }

    // 2. Prepare Update Fields
    const updateFields = {};

    if (fullName && fullName.trim() !== "") {
        updateFields.fullName = fullName.trim();
    }

    // Handle email update logic
    if (email && email.trim() !== "") {
        const trimmedEmail = email.trim().toLowerCase();

        // Check if the new email already exists (excluding the current user's document)
        const existingUserWithEmail = await User.findOne({ 
        email: trimmedEmail,
            _id: { $ne: userId } // $ne means Not Equal to the current user's ID
        });

        if (existingUserWithEmail) {
            throw new ApiError(409, "Email is already in use by another account");
        }

        updateFields.email = trimmedEmail;
    }

    // 3. Update the User document
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        {
            new: true, // Return the new document
            runValidators: true, // Run Mongoose validators (e.g., email format)
        }
    ).select("-password -refreshToken"); // Selectively exclude sensitive data

    if (!updatedUser) {
        // Should not happen if user is authenticated, but good practice
        throw new ApiError(404, "User not found");
    }

    // 4. Success Response
    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedUser, "Profile updated successfully")
        );
});


// --done
const getUserPosts = asyncHandler(async (req, res) => {
	const { userId } = req.params;
		
	// 1. Get pagination parameters
	const page = parseInt(req.query.page) || 1; 
	const limit = 8; // Fixed limit as requested
	const skip = (page - 1) * limit;

	// 2. Validation: Check for valid target User ID
	if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
		throw new ApiError(400, "Invalid User ID");
	}

	// 3. Define the corrected filter query
	const query = {
		// 🛑 CORRECTION: Changed 'ownerId' to 'owner' to match your Post model
		owner: userId, // Posts belong to the user ID from params
		isPublic: true,  // Only public posts are visible
	};

	// 4. Execute queries
		
	// A. Get the total count of matching documents for pagination metadata
	const totalPosts = await Post.countDocuments(query);

	// B. Get the paginated and sorted posts
	const posts = await Post.find(query)
		.sort({ createdAt: -1 }) // Sort by latest (descending)
		.skip(skip)              // Apply pagination skip
		.limit(limit)            // Apply pagination limit
		// 🛑 CORRECTION: Changed 'ownerId' to 'owner' to populate the correct field
		.populate("owner", "username avatar") 
		.lean();

	// 5. Calculate pagination metadata
	const totalPages = Math.ceil(totalPosts / limit);
	const hasNextPage = page < totalPages;
	const hasPrevPage = page > 1;

	// 6. Construct the final response data
	const responseData = {
		posts,
		pagination: {
		totalPosts,
		totalPages,
		currentPage: page,
		hasNextPage,
		hasPrevPage,
		limit,
		},
	};

	// 7. Success Response
	return res
		.status(200)
		.json(
		new ApiResponse(200, responseData, "Public user posts fetched successfully")
		);
});

export {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUserProfile,
    getUserProfile,
    updateMyProfile,
    getUserPosts
};
