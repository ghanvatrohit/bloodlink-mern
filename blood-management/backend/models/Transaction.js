const mongoose = require("mongoose");
const txSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
  from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bloodGroup: String,
  quantity: Number,
  status: { type: String, default: "success" },
}, { timestamps: true });
module.exports = mongoose.model("Transaction", txSchema);
