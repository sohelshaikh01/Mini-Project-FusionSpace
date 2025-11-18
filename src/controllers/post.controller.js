import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"


// Get = public + auth
const getPosts = asyncHandler( async(req, res) => {

});

// Post = auth
const publishAPost = asyncHandler( async(req, res) => {

});

// Get = publish + auth
const getPostById = asyncHandler( async(req, res) => {

});

// Patch = auth
const updateAPost = asyncHandler( async(req, res) => {

});

// Delete = auth
const deleteAPost = asyncHandler( async(req, res) => {

});

// Patch = auth
const togglePublishStatus = asyncHandler( async(req, res) => {

});

// Get = if post is public
const searchPost = asyncHandler ( async(req, res) => {

});

export {
    getPosts,
    publishAPost,
    getPostById,
    updateAPost,
    deleteAPost,
    togglePublishStatus,
    searchPost
}



