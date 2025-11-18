import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHanlder( async(req, res) => {
    res.status(200)
    .json(new ApiResponse(200, "Server is healthy"));
})