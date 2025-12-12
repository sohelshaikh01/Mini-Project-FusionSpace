import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
	likeBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true
	},
	postId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Post",
		default: null
	},
	commentId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Comment",
		default: null
	},
  },
  { timestamps: true }
);

export const Like = mongoose.model("Like", likeSchema);