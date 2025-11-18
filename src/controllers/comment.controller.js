// Post = auth
// get postid, content and user
// validate fields
// check is post exists
// create new comments - content, postid, userid
// return res
const createComment = async(req, res) => {
    const { content, postId } = req.body;

    if(!(content || postId)) {
        throw new ApiError(400, "Comment is required");
    }

    const userId = req.user._id;

    const comment = await Comment.create({
        content,
        owner: userId,
        postId
    });

    (!comment) {
        throw new ApiError("Failed to create comment");
    }

    return
        res.status(200)
            .json(
                new ApiResponse(201, comment, "Comment is created Successfully")
            )

}

// Get = public
// getpost id and videoid, page, limit
// validate videoid
// fetch all comments of post, paginate and sort by latest
// if comments exists, user and likes
// Else return empty array
const getComments = async(req, res) => {

}

// Post = auth
// const replyComment = async(req, res) => {
// }

// Patch = auth owner only
// get commentId, content
// validate comId, content - is empty
// find comment by comId
// check comm.ownerId = login userId
// update content and set updated timestamp
// save and return updated comment
const editComment = async(req, res) => {

}

// Patch = auth owner only
// get comId
// validate comId
// find comment by comId
// check owner = login userId
// delete comment
// remove comment from likes collection
// return success message
const deleteComment = async(req, res) => {

}

export {
    // replyComment,
    createComment,
    getComments,
    editComment,
    deleteComment
}
