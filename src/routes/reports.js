const express = require("express");
const { auth } = require("../middleware/auth");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");

const router = express.Router();
router.use(auth);

function parseDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// GET /api/reports/by-category?start=YYYY-MM-DD&end=YYYY-MM-DD&type=expense
router.get("/by-category", async (req, res, next) => {
  try {
    const { start, end, type = "expense" } = req.query;

    const startD = parseDateOrNull(start);
    const endD = parseDateOrNull(end);
    if (!startD || !endD) return res.status(400).json({ message: "start and end are required (valid dates)" });
    if (startD > endD) return res.status(400).json({ message: "start must be <= end" });

    const pipeline = [
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
          type,
          date: { $gte: startD, $lte: endD },
        },
      },
      {
        $group: {
          _id: "$categoryId",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          categoryId: "$_id",
          categoryName: { $ifNull: ["$category.name", "Unknown"] },
          total: 1,
          count: 1,
        },
      },
      { $sort: { total: -1 } },
    ];

    const data = await Transaction.aggregate(pipeline);
    res.json({ start: startD, end: endD, type, data });
  } catch (e) {
    next(e);
  }
});

const Budget = require("../models/Budget");

// GET /api/reports/budget-vs-spent?month=YYYY-MM
router.get("/budget-vs-spent", async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!/^\d{4}-\d{2}$/.test(month || "")) {
      return res.status(400).json({ message: "month is required (YYYY-MM)" });
    }

    const start = new Date(month + "-01T00:00:00.000Z");
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);

    const budget = await Budget.findOne({ userId: req.user.id, month }).lean();
    const limits = budget?.limits || [];

    // spent per category for the month
    const spent = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.id),
          type: "expense",
          date: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: "$categoryId", spent: { $sum: "$amount" } } },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          categoryId: "$_id",
          categoryName: { $ifNull: ["$category.name", "Unknown"] },
          spent: 1,
        },
      },
    ]);

    // merge limits + spent (simple JS merge = понятно и быстро)
    const spentMap = new Map(spent.map(x => [String(x.categoryId), x]));
    const out = limits.map(l => {
      const s = spentMap.get(String(l.categoryId));
      return {
        categoryId: l.categoryId,
        categoryName: s?.categoryName || "Unknown",
        limit: l.limit,
        spent: s?.spent || 0,
        remaining: l.limit - (s?.spent || 0),
      };
    });

    // also include spent categories that have no limit
    for (const s of spent) {
      if (!limits.some(l => String(l.categoryId) === String(s.categoryId))) {
        out.push({
          categoryId: s.categoryId,
          categoryName: s.categoryName,
          limit: 0,
          spent: s.spent,
          remaining: -s.spent,
        });
      }
    }

    out.sort((a, b) => b.spent - a.spent);

    res.json({ month, start, end, data: out });
  } catch (e) {
    next(e);
  }
});


module.exports = router;
