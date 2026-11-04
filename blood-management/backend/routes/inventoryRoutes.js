const router = require("express").Router();
const Inventory = require("../models/Inventory");
const { protect, allow } = require("../middleware/auth");

// Search blood availability across organizations/hospitals
router.get("/search", protect, async (req, res) => {
  const q = { quantity: { $gt: 0 } };
  if (req.query.bloodGroup) q.bloodGroup = req.query.bloodGroup;
  const data = await Inventory.find(q).populate("owner", "name city phone role");
  res.json({ success: true, data: data.filter((d) => d.owner) });
});
router.use(protect, allow("hospital", "organization"));
router.get("/", async (req, res) => res.json({ success: true, data: await Inventory.find({ owner: req.user._id }).sort("bloodGroup") }));
router.post("/", async (req, res, next) => {
  try {
    const { bloodGroup, quantity, expiryDate } = req.body;
    const item = await Inventory.findOneAndUpdate(
      { owner: req.user._id, bloodGroup },
      { $inc: { quantity: Number(quantity) }, ...(expiryDate && { expiryDate }) },
      { upsert: true, new: true }
    );
    res.status(201).json({ success: true, message: "Inventory updated", data: item });
  } catch (e) { next(e); }
});
router.put("/:id", async (req, res) => {
  const item = await Inventory.findOneAndUpdate({ _id: req.params.id, owner: req.user._id },
    { quantity: req.body.quantity, expiryDate: req.body.expiryDate }, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, message: "Updated", data: item });
});
router.delete("/:id", async (req, res) => {
  await Inventory.deleteOne({ _id: req.params.id, owner: req.user._id });
  res.json({ success: true, message: "Deleted" });
});
module.exports = router;
