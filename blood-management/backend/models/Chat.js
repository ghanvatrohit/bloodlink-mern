const mongoose = require("mongoose");
const chatSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // customer or hospital
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bloodGroup: { type: String, required: true },
  quantity: { type: Number, required: true },
  status: { type: String, enum: ["pending", "negotiating", "confirmed", "allotted", "rejected"], default: "pending" },
  requesterConfirmed: { type: Boolean, default: false },
  lastMessageAt: { type: Date, default: Date.now },
}, { timestamps: true });
module.exports = mongoose.model("Chat", chatSchema);
