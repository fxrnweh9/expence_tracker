const express = require("express");
const mongoose = require("mongoose");
const { auth } = require("../middleware/auth");
const Budget = require("../models/Budget");
const Category = require("../models/Category");

const router = express.Router();
router.use(auth);

// GET /api/budgets/:month  (month = YYYY-MM)
router.get("/:month", async (req, res, next) => {
  try {
    const { month } = req.params;
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: "month must be YYYY-MM" });

    let budget = await Budget.findOne({ userId: req.user.id, month });
    if (!budget) budget = await Budget.create({ userId: req.user.id, month, limits: [] });

    res.json(budget);
  } catch (e) {
    next(e);
  }
});

// POST /api/budgets/:month/limits  { categoryId, limit }
// uses $push (advanced update)
router.post("/:month/limits", async (req, res, next) => {
  try {
    const { month } = req.params;
    const { categoryId, limit } = req.body || {};

    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: "month must be YYYY-MM" });
    if (!mongoose.isValidObjectId(categoryId)) return res.status(400).json({ message: "invalid categoryId" });
    if (typeof limit !== "number") return res.status(400).json({ message: "limit must be number" });

    const cat = await Category.findOne({ _id: categoryId, userId: req.user.id });
    if (!cat) return res.status(404).json({ message: "category not found" });

    // upsert budget, but avoid duplicates: if exists, reject
    const budget = await Budget.findOne({ userId: req.user.id, month });
    if (budget?.limits?.some(x => String(x.categoryId) === String(categoryId))) {
      return res.status(409).json({ message: "limit for this category already exists (use PATCH)" });
    }

    const updated = await Budget.findOneAndUpdate(
      { userId: req.user.id, month },
      { $push: { limits: { categoryId, limit } } },
      { new: true, upsert: true }
    );

    res.status(201).json(updated);
  } catch (e) {
    // unique userId+month
    if (e.code === 11000) return res.status(409).json({ message: "budget already exists, retry" });
    next(e);
  }
});

// PATCH /api/budgets/:month/limits  { categoryId, limit }
// positional array update using arrayFilters ($[x])
router.patch("/:month/limits", async (req, res, next) => {
  try {
    const { month } = req.params;
    const { categoryId, limit } = req.body || {};

    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: "month must be YYYY-MM" });
    if (!mongoose.isValidObjectId(categoryId)) return res.status(400).json({ message: "invalid categoryId" });
    if (typeof limit !== "number") return res.status(400).json({ message: "limit must be number" });

    const updated = await Budget.findOneAndUpdate(
      { userId: req.user.id, month },
      { $set: { "limits.$[x].limit": limit } },
      { new: true, arrayFilters: [{ "x.categoryId": new mongoose.Types.ObjectId(categoryId) }] }
    );

    if (!updated) return res.status(404).json({ message: "budget not found" });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/budgets/:month/limits/:categoryId  ($pull)
router.delete("/:month/limits/:categoryId", async (req, res, next) => {
  try {
    const { month, categoryId } = req.params;

    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: "month must be YYYY-MM" });
    if (!mongoose.isValidObjectId(categoryId)) return res.status(400).json({ message: "invalid categoryId" });

    const updated = await Budget.findOneAndUpdate(
      { userId: req.user.id, month },
      { $pull: { limits: { categoryId: new mongoose.Types.ObjectId(categoryId) } } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "budget not found" });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
