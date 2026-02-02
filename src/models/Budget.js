const mongoose = require("mongoose");

const limitSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    limit: { type: Number, required: true },
  },
  { _id: false }
);

const budgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    month: { type: String, required: true }, // format: "YYYY-MM"
    limits: { type: [limitSchema], default: [] }, // embedded array
  },
  { timestamps: true }
);

// one budget per user per month
budgetSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("Budget", budgetSchema);
