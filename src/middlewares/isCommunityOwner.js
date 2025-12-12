import { asyncHandler } from "../utils/asyncHandler.js";
import { Community } from "../models/community.models.js";

const isCommunityOwner = asyncHandler(async (req, res, next) => {
    const { communityId } = req.params;

    const community = await Community.findById(communityId);

    if (community.ownerId.toString() !== req.user._id.toString())
        throw new ApiError(403, "Only owner can modify community");

    next();
});


export default isCommunityOwner;