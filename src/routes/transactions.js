const express = require("express");
const mongoose = require("mongoose");
const { auth } = require("../middleware/auth");
const Transaction = require("../models/Transaction");
const Category = require("../models/Category");

const router = express.Router();
router.use(auth);

function parseDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// --------------------
// CREATE
// --------------------
router.post("/", async (req, res, next) => {
  try {
    const { categoryId, type, amount, date, note } = req.body || {};

    if (!mongoose.isValidObjectId(categoryId)) return res.status(400).json({ message: "invalid categoryId" });
    if (!["income", "expense"].includes(type)) return res.status(400).json({ message: "type must be income|expense" });
    if (typeof amount !== "number") return res.status(400).json({ message: "amount must be number" });

    const d = parseDateOrNull(date);
    if (!d) return res.status(400).json({ message: "invalid date" });

    const cat = await Category.findOne({ _id: categoryId, userId: req.user.id });
    if (!cat) return res.status(404).json({ message: "category not found" });

    const created = await Transaction.create({
      userId: req.user.id,
      categoryId,
      type,
      amount,
      date: d,
      note: note ? String(note) : "",
    });

    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

// --------------------
// LIST (filters)
// --------------------
router.get("/", async (req, res, next) => {
  try {
    const { start, end, type, categoryId } = req.query;

    const filter = { userId: req.user.id };

    if (type && ["income", "expense"].includes(type)) filter.type = type;

    if (categoryId) {
      if (!mongoose.isValidObjectId(categoryId)) return res.status(400).json({ message: "invalid categoryId" });
      filter.categoryId = categoryId;
    }

    const startD = parseDateOrNull(start);
    const endD = parseDateOrNull(end);

    if (start || end) {
      if (!startD || !endD) return res.status(400).json({ message: "start and end must be valid dates" });
      if (startD > endD) return res.status(400).json({ message: "start must be <= end" });
      filter.date = { $gte: startD, $lte: endD };
    }

    const items = await Transaction.find(filter).sort({ date: -1 }).limit(200);
    res.json(items);
  } catch (e) {
    next(e);
  }
});

// --------------------
// ADVANCED DELETE (IMPORTANT: must be BEFORE /:id)
// DELETE /api/transactions/purge/before/2026-01-01
// --------------------
router.delete("/purge/before/:date", async (req, res, next) => {
  try {
    const d = parseDateOrNull(req.params.date);
    if (!d) return res.status(400).json({ message: "invalid date" });

    const result = await Transaction.deleteMany({ userId: req.user.id, date: { $lt: d } });
    res.json({ deletedCount: result.deletedCount });
  } catch (e) {
    next(e);
  }
});

// --------------------
// ADVANCED UPDATE ($inc) (also BEFORE /:id)
// PATCH /api/transactions/:id/inc  { "delta": 1000 }
// --------------------
router.patch("/:id/inc", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { delta } = req.body || {};

    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "invalid id" });
    if (typeof delta !== "number") return res.status(400).json({ message: "delta must be number" });

    const updated = await Transaction.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { $inc: { amount: delta } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "not found" });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// --------------------
// READ ONE
// --------------------
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "invalid id" });

    const item = await Transaction.findOne({ _id: id, userId: req.user.id });
    if (!item) return res.status(404).json({ message: "not found" });

    res.json(item);
  } catch (e) {
    next(e);
  }
});

// --------------------
// UPDATE (PATCH)
// --------------------
router.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "invalid id" });

    const patch = {};
    const { categoryId, type, amount, date, note } = req.body || {};

    if (categoryId !== undefined) {
      if (!mongoose.isValidObjectId(categoryId)) return res.status(400).json({ message: "invalid categoryId" });
      const cat = await Category.findOne({ _id: categoryId, userId: req.user.id });
      if (!cat) return res.status(404).json({ message: "category not found" });
      patch.categoryId = categoryId;
    }
    if (type !== undefined) {
      if (!["income", "expense"].includes(type)) return res.status(400).json({ message: "type must be income|expense" });
      patch.type = type;
    }
    if (amount !== undefined) {
      if (typeof amount !== "number") return res.status(400).json({ message: "amount must be number" });
      patch.amount = amount;
    }
    if (date !== undefined) {
      const d = parseDateOrNull(date);
      if (!d) return res.status(400).json({ message: "invalid date" });
      patch.date = d;
    }
    if (note !== undefined) patch.note = String(note);

    const updated = await Transaction.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { $set: patch },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "not found" });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// --------------------
// DELETE ONE
// --------------------
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "invalid id" });

    const deleted = await Transaction.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!deleted) return res.status(404).json({ message: "not found" });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});


// PATCH /api/transactions/:id/inc  { delta: number }  uses $inc
router.patch("/:id/inc", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { delta } = req.body || {};
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "invalid id" });
    if (typeof delta !== "number") return res.status(400).json({ message: "delta must be number" });

    const updated = await Transaction.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { $inc: { amount: delta } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "not found" });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});


module.exports = router;
