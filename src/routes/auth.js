const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

router.post("/register", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "email and password are required" });
    if (String(password).length < 6) return res.status(400).json({ message: "password must be at least 6 chars" });

    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(409).json({ message: "email already exists" });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({ email, passwordHash });

    res.status(201).json({ id: user._id, email: user.email });
  } catch (e) {
    next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "email and password are required" });

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(401).json({ message: "invalid credentials" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ message: "invalid credentials" });

    const token = jwt.sign({ userId: String(user._id) }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
