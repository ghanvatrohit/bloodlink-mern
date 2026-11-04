const router = require("express").Router();
const Donation = require("../models/Donation");
const Inventory = require("../models/Inventory");
const { protect, allow } = require("../middleware/auth");
router.use(protect);
router.post("/", allow("donor"), async (req, res) => {
  const d = await Donation.create({ donor: req.user._id, facility: req.body.facilityId, date: req.body.date,
    bloodGroup: req.user.bloodGroup, quantity: req.body.quantity || 450 });
  res.status(201).json({ success: true, message: "Donation scheduled", data: d });
});
router.get("/", async (req, res) => {
  const q = req.user.role === "donor" ? { donor: req.user._id } : { facility: req.user._id };
  res.json({ success: true, data: await Donation.find(q).populate("donor", "name bloodGroup").populate("facility", "name city").sort("-date") });
});
// facility marks donation completed -> adds to inventory
router.patch("/:id/complete", allow("hospital", "organization"), async (req, res) => {
  const d = await Donation.findOne({ _id: req.params.id, facility: req.user._id, status: "scheduled" });
  if (!d) return res.status(404).json({ success: false, message: "Not found" });
  d.status = "completed"; await d.save();
  await Inventory.findOneAndUpdate({ owner: req.user._id, bloodGroup: d.bloodGroup }, { $inc: { quantity: d.quantity } }, { upsert: true });
  res.json({ success: true, message: "Donation completed, inventory updated" });
});
router.patch("/:id/cancel", async (req, res) => {
  await Donation.updateOne({ _id: req.params.id, $or: [{ donor: req.user._id }, { facility: req.user._id }] }, { status: "cancelled" });
  res.json({ success: true, message: "Donation cancelled" });
});
module.exports = router;
