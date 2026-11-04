const router = require("express").Router();
const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const Inventory = require("../models/Inventory");
const Transaction = require("../models/Transaction");
const { protect, allow } = require("../middleware/auth");
router.use(protect);

const POP = [{ path: "requester", select: "name role city" }, { path: "organization", select: "name role city" }];
const isMember = (chat, uid) => [String(chat.requester._id || chat.requester), String(chat.organization._id || chat.organization)].includes(String(uid));

async function postMessage(req, chat, text, type = "text", sender = req.user._id) {
  const msg = await (await Message.create({ chat: chat._id, sender: type === "system" ? null : sender, text, type })).populate("sender", "name role");
  chat.lastMessageAt = new Date(); await chat.save();
  const io = req.app.get("io");
  io.to(`chat:${chat._id}`).emit("new_message", msg);
  const full = await Chat.findById(chat._id).populate(POP);
  [chat.requester, chat.organization].forEach((u) => io.to(`user:${u._id || u}`).emit("chat_updated", full));
  return msg;
}

// Create request (customer / hospital -> organization)
router.post("/", allow("customer", "hospital"), async (req, res, next) => {
  try {
    const { organizationId, bloodGroup, quantity, message } = req.body;
    const chat = await Chat.create({ requester: req.user._id, organization: organizationId, bloodGroup, quantity });
    await postMessage(req, chat, message || `Hello, I need ${quantity} ml of ${bloodGroup} blood. Is it available?`);
    req.app.get("io").to(`user:${organizationId}`).emit("notification", { type: "new_request", text: `New blood request from ${req.user.name}`, chatId: chat._id });
    res.status(201).json({ success: true, message: "Request sent", data: await chat.populate(POP) });
  } catch (e) { next(e); }
});
router.get("/", async (req, res) => {
  const data = await Chat.find({ $or: [{ requester: req.user._id }, { organization: req.user._id }] }).populate(POP).sort("-lastMessageAt");
  res.json({ success: true, data });
});
router.get("/:id/messages", async (req, res) => {
  const chat = await Chat.findById(req.params.id).populate(POP);
  if (!chat || !isMember(chat, req.user._id)) return res.status(404).json({ success: false, message: "Chat not found" });
  res.json({ success: true, chat, data: await Message.find({ chat: chat._id }).populate("sender", "name role").sort("createdAt") });
});
router.post("/:id/messages", async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat || !isMember(chat, req.user._id)) return res.status(404).json({ success: false, message: "Chat not found" });
  if (chat.status === "pending" && String(chat.organization) === String(req.user._id)) chat.status = "negotiating";
  const msg = await postMessage(req, chat, req.body.text);
  const other = String(chat.requester) === String(req.user._id) ? chat.organization : chat.requester;
  req.app.get("io").to(`user:${other}`).emit("notification", { type: "message", text: `${req.user.name}: ${req.body.text}`, chatId: chat._id });
  res.json({ success: true, data: msg });
});
// Requester confirms the deal
router.patch("/:id/confirm", async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat || String(chat.requester) !== String(req.user._id)) return res.status(403).json({ success: false, message: "Only requester can confirm" });
  chat.requesterConfirmed = true; chat.status = "confirmed";
  await postMessage(req, chat, `${req.user.name} confirmed the transaction.`, "system");
  res.json({ success: true, message: "Confirmed" });
});
router.patch("/:id/reject", allow("organization"), async (req, res) => {
  const chat = await Chat.findOne({ _id: req.params.id, organization: req.user._id });
  if (!chat) return res.status(404).json({ success: false, message: "Not found" });
  chat.status = "rejected";
  await postMessage(req, chat, "Request was declined by the organization.", "system");
  res.json({ success: true, message: "Request rejected" });
});
// Organization allots blood: atomic deduction + transaction
router.post("/:id/allot", allow("organization"), async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, organization: req.user._id });
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found" });
    if (chat.status === "allotted") return res.status(400).json({ success: false, message: "Already allotted" });
    if (!chat.requesterConfirmed) return res.status(400).json({ success: false, message: "Requester has not confirmed yet" });
    const inv = await Inventory.findOneAndUpdate(
      { owner: req.user._id, bloodGroup: chat.bloodGroup, quantity: { $gte: chat.quantity } },
      { $inc: { quantity: -chat.quantity } }, { new: true });
    if (!inv) return res.status(400).json({ success: false, message: "Insufficient stock" });
    const tx = await Transaction.create({ chat: chat._id, from: req.user._id, to: chat.requester, bloodGroup: chat.bloodGroup, quantity: chat.quantity });
    // If requester is a hospital, add to its inventory
    const reqUser = await mongoose.model("User").findById(chat.requester);
    if (reqUser?.role === "hospital")
      await Inventory.findOneAndUpdate({ owner: reqUser._id, bloodGroup: chat.bloodGroup }, { $inc: { quantity: chat.quantity } }, { upsert: true });
    chat.status = "allotted";
    await postMessage(req, chat, `✅ Blood Allotted Successfully: ${chat.quantity} ml of ${chat.bloodGroup}.`, "system");
    req.app.get("io").to(`user:${chat.requester}`).emit("notification", { type: "allotted", text: "Blood Allotted Successfully!", chatId: chat._id });
    res.json({ success: true, message: "Blood Allotted Successfully", data: tx });
  } catch (e) { next(e); }
});
// Allotment / transaction history
router.get("/transactions/history", async (req, res) => {
  const data = await Transaction.find({ $or: [{ from: req.user._id }, { to: req.user._id }] })
    .populate("from", "name").populate("to", "name").sort("-createdAt");
  res.json({ success: true, data });
});
module.exports = router;
