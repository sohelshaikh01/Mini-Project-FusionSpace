import mongoose, { Schema } from "mongoose";

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
		default: null
	  },
	  userId: {
		type: mongoose.Types.ObjectId,
		ref: "User",
		type: required
	  },
	  communityId: {
		type: mongoose.Types.ObjectId,
		ref: "",
		default: null
	  }
  },
  { timestamps: true }
);

export const Post = mongoose.model("Post", postSchema);
