import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const postSchema = new Schema(
  {
	  text: {
		type: String,
		required: true
	  },
	  image: {
		type: String,
		// optional
	  },
	  isPublic: {
		type: Boolean,
		required: true,
		default: true
	  },
	  owner: {
		type: mongoose.Types.ObjectId,
		ref: "User",
		required: true
	  },
	  communityId: {
		type: mongoose.Types.ObjectId,
		ref: "",
		default: null
	  },
	  likeCount: {
		type: Number,
		default: 0
	  },
	  commentCount: {
		type: Number,
		default: 0
	  }
  },
  { timestamps: true }
);

postSchema.plugin(mongooseAggregatePaginate);

export const Post = mongoose.model("Post", postSchema);
