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

// --
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

    const refreshToken = await generateRefreshToken(user._id);

    const createdUser = await User.findById( user._id ).select(
        "-password -refreshToken"
    ).lean();


    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registration process");
    }

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse( 200, {
            user: createdUser,
            refreshToken
        },
        "User Logged in Successfully"
        )
    );
    
});

// --
const loginUser = asyncHandler (async(req, res) => {

    const { email, password } = req.body;
    
    if(!email) {
        throw new ApiError(400, "email is required");
    }
    
    const user = await User.findOne({
        email
    });
    
    if(!user) {
        throw new ApiError(404, "User does not exits");
    }
    
    const isPasswordValid = await user.isPasswordCorrect(password);
    
    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }
    
    const refreshToken = await generateRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

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

// --
const logoutUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Remove the refreshToken from the database
    await User.findByIdAndUpdate(
        userId,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User logged out successfully")
        );
});

// /get - auth --
const getCurrentUserProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userProfile = await User.findById(userId).select(
        "-password -refreshToken"
    );

    if (!userProfile) {
        throw new ApiError(404, "User not found");
    }

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
    */
});

// /get - public --
const getUserProfile = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const loggedInUserId = req.user?._id;

    // 1. Validation: Check for valid target User ID
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid User ID");
    }

    // 2. Fetch the target User Profile
    const user = await User.findById(userId).select(
        "-password -refreshToken"
    );

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // 3. Determine Following Status (only if a user is logged in)
    let isFollowing = false;

    if (loggedInUserId) {
        const followRecord = await Follow.findOne({
            followerId: loggedInUserId,
            followingId: userId,
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
    };

    return res
        .status(200)
        .json(
        new ApiResponse(200, profileData, "User profile fetched successfully")
        );
});

// /get - auth --
// only fullName and email update
const updateMyProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;
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

    if (email && email.trim() !== "") {
        const trimmedEmail = email.trim().toLowerCase();

        const existingUserWithEmail = await User.findOne({ 
        email: trimmedEmail,
            _id: { $ne: userId }
            // Not equal to current user
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
            new: true,
            runValidators: true,
        }
    ).select("-password -refreshToken");

    if (!updatedUser) {
        throw new ApiError(404, "User not found");
    }
    
    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedUser, "Profile updated successfully")
        );
});

// /get - clicked profile
const getUserPosts = asyncHandler(async (req, res) => {
	const { userId } = req.params;
		
	// 1. Get pagination parameters
	const page = parseInt(req.query.page) || 1; 
	const limit = 8;
	const skip = (page - 1) * limit;

	// 2. Validation: Check for valid target User ID
	if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
		throw new ApiError(400, "Invalid User ID");
	}

	// 3. Define the corrected filter query
	const query = {
		owner: userId,
		isPublic: true,
	};
		
	// A. Get the total count of matching documents for pagination metadata
	const totalPosts = await Post.countDocuments(query);

	// B. Get the paginated and sorted posts
	const posts = await Post.find(query)
		.sort({ createdAt: -1 })
		.skip(skip)            
		.limit(limit)           
		.populate("owner", "username avatar") 
		.lean();

	// 5. Calculate pagination metadata
	const totalPages = Math.ceil(totalPosts / limit);
	const hasNextPage = page < totalPages;
	const hasPrevPage = page > 1;

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
