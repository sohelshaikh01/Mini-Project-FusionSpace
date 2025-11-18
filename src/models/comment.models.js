import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const commentSchema = new Schema(
    {
        content: {
            type: String,
            required: true
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        // parentComment: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: "Comment",
        //     default: null
        // },
        postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
        }
    },
    { timestamps: true }
)

export const Comment = mongoose.model("Comment", commentSchema);
