import mongoose, { Schema } from "mongoose";

const communitySchema = new Schema(
  {
    communityName: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },
    avatar: {
      type: String,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

export const Community = mongoose.model("Community", communitySchema);
