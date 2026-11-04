const router = require("express").Router();
const User = require("../models/User");
const { protect } = require("../middleware/auth");
// list hospitals / organizations (optionally by city) for donors, customers and hospitals
router.get("/facilities", protect, async (req, res) => {
  const q = { role: { $in: req.query.role ? [req.query.role] : ["hospital", "organization"] } };
  if (req.query.city) q.city = new RegExp(req.query.city, "i");
  res.json({ success: true, data: await User.find(q).select("name email phone address city role") });
});
module.exports = router;
