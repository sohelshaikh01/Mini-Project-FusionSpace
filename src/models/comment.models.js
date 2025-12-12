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
        likeCount: {
            type: Number,
            default: 0
        },
        postId: {
            type: Schema.Types.ObjectId,
            ref: "Post",
        }
    },
    { timestamps: true }
);

commentSchema.plugin(mongooseAggregatePaginate)

export const Comment = mongoose.model("Comment", commentSchema);
