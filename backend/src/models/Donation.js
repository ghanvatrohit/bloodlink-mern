import mongoose from 'mongoose';
import { BLOOD_GROUPS } from '../utils/constants.js';
const donationSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  facility: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
  units: { type: Number, default: 1, min: 1, max: 2 },
  status: { type: String, enum: ['Scheduled', 'Accepted', 'Rejected'], default: 'Scheduled' },
  scheduledAt: Date,
  batchNo: String,
  certificateId: String,
  driveName: String,
}, { timestamps: true });
donationSchema.index({ donor: 1, createdAt: -1 });
donationSchema.index({ facility: 1, status: 1 });
export default mongoose.model('Donation', donationSchema);
