const mongoose = require("mongoose");
const donationSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  facility: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // hospital or org
  bloodGroup: String,
  quantity: { type: Number, default: 450 },
  date: { type: Date, required: true },
  status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled" },
}, { timestamps: true });
module.exports = mongoose.model("Donation", donationSchema);
