import mongoose, { Schema } from mongoose;

const followSchema = new Schema(
  {
    follwerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    followingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }
  },
  { timestamps: true}
);

export default followSchema = mongoose.model("FollowSchema", followSchema);