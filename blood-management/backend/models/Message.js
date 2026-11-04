const mongoose = require("mongoose");
const messageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // null => system message
  text: { type: String, required: true },
  type: { type: String, enum: ["text", "system"], default: "text" },
}, { timestamps: true });
module.exports = mongoose.model("Message", messageSchema);
