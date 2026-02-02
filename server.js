require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { connectDB } = require("./src/db");

const authRoutes = require("./src/routes/auth");
const categoryRoutes = require("./src/routes/categories");
const transactionRoutes = require("./src/routes/transactions");
const reportRoutes = require("./src/routes/reports");
const budgetRoutes = require("./src/routes/budgets");


const app = express();

app.use(cors());
app.use(express.json());

// static frontend
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/budgets", budgetRoutes);


// health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

connectDB()
  .then(() => {
    const port = Number(process.env.PORT || 3000);
    app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
  })
  .catch((e) => {
    console.error("DB connection failed:", e);
    process.exit(1);
  });
