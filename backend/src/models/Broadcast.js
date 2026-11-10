import mongoose from 'mongoose';
const broadcastSchema = new mongoose.Schema({
  title: { type: String, required: true }, body: { type: String, required: true },
  type: { type: String, enum: ['maintenance', 'shortage', 'sos'], default: 'shortage' },
  city: String, bloodGroup: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
export default mongoose.model('Broadcast', broadcastSchema);
