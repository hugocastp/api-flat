const mongoose = require("mongoose");

const textSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    tag: {
      type: String,
      trim: true
    },
    filename: {
      type: String,
      required: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Collection",
    },
  },
  {
    timestamps: true,
  }
);

const textModel = mongoose.model("Text", textSchema);

module.exports = textModel;
