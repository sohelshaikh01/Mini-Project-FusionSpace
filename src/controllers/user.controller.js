import { ApiError } from "../utils/ApiError.js";
import { asyncHandler }  from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
    uploadOnCloudinary,
    removeFromCloudinary
} from "../utils/cloudinary.js";

import { User } from "../models/user.models.js";

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


// not returning properly
const logoutUser = asyncHandler ( async(req, res) => {
    
    const userId = req.user._id;

    User.findByIdAndUpdate(
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
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User logged out successfully")
    );
});


const UserProfile = asyncHandler ( async(req, res) => {
    return res
    .status(200)
    .json( new ApiResponse(200, req.user, "Current user details fetched successfully"));
    // get user details by aggregate
});


const getUserProfile = asyncHandler ( async(req, res) => {
    // get username
    // valid username
    // aggregate followers, following, userdetails
    // No details then error
    // return res
});


const updateMyProfile = asyncHandler ( async(req, res) => {
    // get fullname, email
    // check validation
    // find By Id and Update
    // return res - password
});


const getUserPosts = asyncHandler ( async(req, res) => {
    // get User
    // validate username
    // find User
    // find post are public
    // If not post return message
    // return posts
});

// Update Password
// Update Avatar

export {
    registerUser,
    loginUser,
    logoutUser,
    UserProfile,
    getUserProfile,
    updateMyProfile,
    getUserPosts
};
