import mongoose, { Schema } from mongoose;

const communityNameSchema = new Schema(
  {
    communityName: {
      type: String,
      required: true,
      lowercase: true
    },
    avatar: {
      type: String,
    },
    ownerid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  { timestamps: true}
);

export default communityNameSchema = mongoose.model("CommunityName", communityNameSchema);