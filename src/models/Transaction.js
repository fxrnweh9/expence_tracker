const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    note: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

// common filters: by user and date desc
transactionSchema.index({ userId: 1, date: -1 });
// report filters: by user + category + date
transactionSchema.index({ userId: 1, categoryId: 1, date: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
