
// Post = auth
// extract channelId and userId
// -- $or to check subscription exists or not
// validate channelId
// check subscriberId == req.userId
// is following exists
// if exists then return error following
// else createOne
// response new follow
const followUser = async(req, res) => {

}

// Delete = auth
// extract channelId and userId
// -- $or to check subscription exists or not
// validate channelId
// check subscriberId == req.userId
// is following exists
// !exists return error not following
// else deleteOne
// response unfollowing
const unfollowUser = async(req, res) => {

}

// Get = Public
// get userId
// validate id
// if not send error
// fetch all where following = userid
// populate username, avatar, userid
// if not return []
// return list
const getFollowers = async(req, res) => {

}

// Get = Public
// get userId and followerId
// validate followerId
// if not send error
// fetch all where followerid = userid
// populate username, avatar, userid
// if not return []
// formulte channel id to string
// return res
const getFollowing = async(req, res) => {

}

export {
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing
}