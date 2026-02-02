const express = require("express");
const mongoose = require("mongoose");
const { auth } = require("../middleware/auth");
const Category = require("../models/Category");

const router = express.Router();

router.use(auth);

router.post("/", async (req, res, next) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ message: "name is required" });

    const category = await Category.create({ userId: req.user.id, name: String(name).trim() });
    res.status(201).json(category);
  } catch (e) {
    // duplicate unique index (userId+name)
    if (e.code === 11000) return res.status(409).json({ message: "category already exists" });
    next(e);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const items = await Category.find({ userId: req.user.id }).sort({ name: 1 });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body || {};
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "invalid id" });
    if (!name) return res.status(400).json({ message: "name is required" });

    const updated = await Category.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { $set: { name: String(name).trim() } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "not found" });
    res.json(updated);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "category already exists" });
    next(e);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "invalid id" });

    const deleted = await Category.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!deleted) return res.status(404).json({ message: "not found" });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
