const router = require("express").Router();
const User = require("../models/User");
const Inventory = require("../models/Inventory");
const Transaction = require("../models/Transaction");
const Chat = require("../models/Chat");
const Donation = require("../models/Donation");
const Message = require("../models/Message"); // Naya add kiya: Messages delete karne ke liye

const { protect, allow } = require("../middleware/auth");
router.use(protect, allow("admin"));

router.get("/users", async (req, res) => {
  const q = req.query.role ? { role: req.query.role } : {};
  res.json({ success: true, data: await User.find(q).select("-password").sort("-createdAt") });
});

router.put("/users/:id", async (req, res) => {
  const { name, phone, city, address, role, bloodGroup } = req.body;
  const u = await User.findByIdAndUpdate(req.params.id, { name, phone, city, address, role, bloodGroup }, { new: true }).select("-password");
  res.json({ success: true, message: "User updated", data: u });
});

router.delete("/users/:id", async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ success: false, message: "Cannot delete yourself" });
  await User.findByIdAndDelete(req.params.id);
  await Inventory.deleteMany({ owner: req.params.id });
  res.json({ success: true, message: "User deleted" });
});

router.get("/analytics", async (req, res) => {
  const [roles, stock, txCount, txVolume, chats, donations] = await Promise.all([
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    Inventory.aggregate([{ $group: { _id: "$bloodGroup", total: { $sum: "$quantity" } } }, { $sort: { _id: 1 } }]),
    Transaction.countDocuments(),
    Transaction.aggregate([{ $group: { _id: null, total: { $sum: "$quantity" } } }]),
    Chat.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Donation.countDocuments({ status: "completed" }),
  ]);
  res.json({ success: true, data: { roles, stock, txCount, txVolume: txVolume[0]?.total || 0, chats, donations } });
});

router.get("/transactions", async (req, res) => {
  res.json({ success: true, data: await Transaction.find().populate("from", "name").populate("to", "name").sort("-createdAt") });
});

// --- NEW CLEAR STORAGE ROUTES (512MB limit management) ---

// 1. Delete All Chats & Messages
router.delete("/clear-chats", async (req, res) => {
  try {
    await Chat.deleteMany({});
    await Message.deleteMany({});
    res.json({ success: true, message: "Sabhi Chats aur Messages delete ho gaye!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Delete All Inventory, Transactions & Donations
router.delete("/clear-inventory", async (req, res) => {
  try {
    await Inventory.deleteMany({});
    await Transaction.deleteMany({});
    await Donation.deleteMany({});
    res.json({ success: true, message: "Sabhi Blood Records aur Transactions delete ho gaye!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Delete All Users (Admin ko chhod kar)
router.delete("/clear-users", async (req, res) => {
  try {
    await User.deleteMany({ role: { $ne: "admin" } });
    res.json({ success: true, message: "Sabhi Users delete ho gaye (Admin safe hai)!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;