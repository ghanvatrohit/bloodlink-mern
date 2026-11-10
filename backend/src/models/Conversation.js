import mongoose from 'mongoose';
const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  pairKey: { type: String, unique: true }, // sorted "idA_idB" for 1-on-1 uniqueness
  lastMessage: { text: String, at: Date, sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } },
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodRequest' },
}, { timestamps: true });
conversationSchema.index({ participants: 1, updatedAt: -1 });
export default mongoose.model('Conversation', conversationSchema);
