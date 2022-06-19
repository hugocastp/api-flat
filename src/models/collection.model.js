const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    tags: Array
  },
  {
    timestamps: true,
  }
);

collectionSchema.virtual("texts", {
  ref: "Text",
  localField: "_id",
  foreignField: "group",
});

//Delete texts when collection is removed
collectionSchema.pre("deleteOne", async function (next) {
  const collection = this.getQuery()["_id"];

  await mongoose.model("Text").deleteMany({'group': collection },function (err, result) {
    if (err) {
      console.log(`[error] ${err}`);
      next(err);
    } else {
      console.log('success');
      next();
    }
  });
});

const collectionModel = mongoose.model("Collection", collectionSchema);

module.exports = collectionModel;
