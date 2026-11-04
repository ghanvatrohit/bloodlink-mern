const router = require("express").Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const safe = (u) => { const o = u.toObject(); delete o.password; return o; };

router.post("/register", async (req, res, next) => {
  try {
    const { role, name, email, password, phone, address, city, bloodGroup } = req.body;
    if (role === "admin") return res.status(403).json({ success: false, message: "Admins are assigned manually" });
    if (await User.findOne({ email })) return res.status(400).json({ success: false, message: "Email already registered" });
    const user = await User.create({ role, name, email, password, phone, address, city, bloodGroup });
    res.status(201).json({ success: true, message: "Registered successfully", token: sign(user._id), user: safe(user) });
  } catch (e) { next(e); }
});
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    res.json({ success: true, message: "Login successful", token: sign(user._id), user: safe(user) });
  } catch (e) { next(e); }
});
router.get("/me", protect, (req, res) => res.json({ success: true, user: req.user }));
module.exports = router;
