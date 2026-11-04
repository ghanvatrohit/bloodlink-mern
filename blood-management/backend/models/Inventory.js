const mongoose = require("mongoose");
// One row per owner (hospital/organization) per blood group; quantity in ml
const inventorySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bloodGroup: { type: String, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], required: true },
  quantity: { type: Number, required: true, min: 0 },
  expiryDate: Date,
}, { timestamps: true });
inventorySchema.index({ owner: 1, bloodGroup: 1 }, { unique: true });
module.exports = mongoose.model("Inventory", inventorySchema);
